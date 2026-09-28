"use strict";

/**
 * Discretisation of curved / bent members into straight solver segments.
 *
 * The solver only knows straight two-node elements. Arc, right-angle and
 * free-form members are split along their drawn path into sub-nodes
 * (`E1.n1`, `E1.n2`, ...) and sub-elements (`E1.s1`, `E1.s2`, ...) that carry
 * `parent`. Loads are mapped by arc length onto the segments and the solver
 * output is merged back per parent member. Tee members are straight and are
 * passed through unchanged.
 */
(function exposeGeometryDiscretize(root, factory) {
  const units = typeof module === "object" && module.exports ? require("./units.js") : root.Units;
  const api = factory(units);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GeometryDiscretize = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createGeometryDiscretize(Units) {
  if (!Units) throw new Error("GeometryDiscretize requires Units.");

  const CURVED_GEOMETRIES = new Set(["arc", "right_angle", "freeform"]);
  const ARC_MIN_SEGMENTS = 8;
  const ARC_MAX_SEGMENTS = 24;
  const ARC_SEGMENT_LENGTH = 0.25;
  const FREEFORM_MAX_SEGMENTS = 24;
  const EPSILON = 1e-9;

  function toNumber(value, unit) {
    return Units.parseQuantity(value ?? 0, unit);
  }

  function formatQuantity(value, unit) {
    const rounded = Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(6));
    return `${rounded} ${unit}`;
  }

  function geometryOf(element) {
    if (element.geometry) return String(element.geometry);
    if (["arc", "tee", "freeform", "right_angle"].includes(String(element.type))) return String(element.type);
    return "straight";
  }

  function isDiscretised(element) {
    return CURVED_GEOMETRIES.has(geometryOf(element));
  }

  function arcCurvature(element) {
    // Mirrors the canvas drawing: a zero / missing curvature falls back to 0.25.
    return Number(element.curvature || (element.sectionParams && element.sectionParams.curvature) || 0.25);
  }

  function quadraticPoint(a, control, b, t) {
    const u = 1 - t;
    return {
      x: u * u * a.x + 2 * u * t * control.x + t * t * b.x,
      y: u * u * a.y + 2 * u * t * control.y + t * t * b.y,
    };
  }

  /**
   * World-space polyline of a member. Arc control point matches the canvas
   * (`mid + normal * curvature * length`, with the screen normal (-dy, dx)
   * mapped to world axes where y points up: (dy, -dx)).
   */
  function elementPath(element, nodeI, nodeJ) {
    const start = { x: Number(nodeI.x), y: Number(nodeI.y) };
    const end = { x: Number(nodeJ.x), y: Number(nodeJ.y) };
    const geometry = geometryOf(element);
    if (geometry === "right_angle") {
      const elbow = { x: end.x, y: start.y };
      const path = [start, elbow, end];
      return dedupe(path);
    }
    if (geometry === "arc") {
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const chord = Math.hypot(dx, dy);
      if (chord <= EPSILON) return [start, end];
      const curvature = arcCurvature(element);
      const control = { x: (start.x + end.x) / 2 + curvature * dy, y: (start.y + end.y) / 2 - curvature * dx };
      const segments = Math.max(ARC_MIN_SEGMENTS, Math.min(ARC_MAX_SEGMENTS, Math.ceil(chord / ARC_SEGMENT_LENGTH)));
      const path = [];
      for (let index = 0; index <= segments; index += 1) {
        const point = quadraticPoint(start, control, end, index / segments);
        path.push({ x: Number(point.x.toFixed(6)), y: Number(point.y.toFixed(6)) });
      }
      path[0] = start;
      path[path.length - 1] = end;
      return dedupe(path);
    }
    if (geometry === "freeform" && Array.isArray(element.path) && element.path.length > 1) {
      const raw = element.path.map((point) => ({ x: Number(point.x), y: Number(point.y) }));
      const stride = Math.max(1, Math.ceil((raw.length - 1) / FREEFORM_MAX_SEGMENTS));
      const path = [];
      for (let index = 0; index < raw.length - 1; index += stride) path.push(raw[index]);
      path.push(raw[raw.length - 1]);
      path[0] = start;
      path[path.length - 1] = end;
      return dedupe(path);
    }
    return [start, end];
  }

  function dedupe(path) {
    const result = [];
    for (const point of path) {
      const last = result[result.length - 1];
      if (last && Math.hypot(point.x - last.x, point.y - last.y) <= EPSILON) continue;
      result.push(point);
    }
    return result.length >= 2 ? result : [path[0], path[path.length - 1]];
  }

  function pathLength(path) {
    let total = 0;
    for (let index = 1; index < path.length; index += 1) {
      total += Math.hypot(path[index].x - path[index - 1].x, path[index].y - path[index - 1].y);
    }
    return total;
  }

  /** Arc-length ratio (0..1) of the point on `path` closest to `point`. */
  function pathRatioAtPoint(path, point) {
    const total = pathLength(path);
    if (!(total > 0)) return 0.5;
    let best = Infinity;
    let bestPosition = 0;
    let offset = 0;
    for (let index = 1; index < path.length; index += 1) {
      const a = path[index - 1];
      const b = path[index];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length2 = dx * dx + dy * dy;
      const t = length2 > 0 ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length2)) : 0;
      const projection = { x: a.x + t * dx, y: a.y + t * dy };
      const distance = Math.hypot(point.x - projection.x, point.y - projection.y);
      const length = Math.sqrt(length2);
      if (distance < best) {
        best = distance;
        bestPosition = offset + t * length;
      }
      offset += length;
    }
    return Math.max(0, Math.min(1, bestPosition / total));
  }

  /** Point on `path` at arc-length ratio (0..1). */
  function pointAtPathRatio(path, ratio) {
    const total = pathLength(path);
    const target = Math.max(0, Math.min(1, Number(ratio))) * total;
    let offset = 0;
    for (let index = 1; index < path.length; index += 1) {
      const a = path[index - 1];
      const b = path[index];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      if (target <= offset + length + EPSILON || index === path.length - 1) {
        const t = length > 0 ? Math.max(0, Math.min(1, (target - offset) / length)) : 0;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      offset += length;
    }
    return { ...path[path.length - 1] };
  }

  function direction(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    return { c: dx / length, s: dy / length };
  }

  function localToGlobal(dir, qx, qy) {
    return { x: dir.c * qx - dir.s * qy, y: dir.s * qx + dir.c * qy };
  }

  function globalToLocal(dir, gx, gy) {
    return { qx: dir.c * gx + dir.s * gy, qy: -dir.s * gx + dir.c * gy };
  }

  /** Intensity of a distributed load (N/m) along the chord-local axis at ratio. */
  function intensityAt(load, axis, ratio) {
    const key = axis === "x" ? "qx" : "qy";
    if (load.kind === "linear_local") {
      const start = toNumber(load[`${key}_i`] ?? load[key] ?? 0, "N/m");
      const end = load[`${key}_j`] == null ? start : toNumber(load[`${key}_j`], "N/m");
      return start + (end - start) * ratio;
    }
    if (load.kind === "polynomial_local") {
      const coefficients = (load[`${key}_coefficients`] || []).map((item) => toNumber(item, "N/m"));
      return coefficients.reduce((sum, coefficient, power) => sum + coefficient * ratio ** power, 0);
    }
    return toNumber(load[key] ?? 0, "N/m");
  }

  function pointLoadPayload(elementId, ratio, load) {
    return {
      element: elementId,
      kind: "point_global",
      ratio: Number(Math.max(0, Math.min(1, ratio)).toFixed(6)),
      fx: load.fx || "0 N",
      fy: load.fy || "0 N",
      mz: load.mz || "0 N*m",
    };
  }

  /**
   * Expand a UI model ({nodes, elements, loads, elementLoads}) into solver
   * nodes / elements / element loads. Returns { nodes, elements, elementLoads,
   * expansion } where expansion[parentId] is null for straight members or
   * { segments: [{ id, start, length, from, to }], nodeIds, length }.
   */
  function expandModel(model) {
    const nodeById = new Map((model.nodes || []).map((node) => [node.id, node]));
    const nodes = [...(model.nodes || [])];
    const elements = [];
    const elementLoads = [];
    const expansion = {};
    const elementById = new Map();

    for (const element of model.elements || []) {
      elementById.set(element.id, element);
      const nodeI = nodeById.get(element.node_i);
      const nodeJ = nodeById.get(element.node_j);
      const path = nodeI && nodeJ && isDiscretised(element) ? elementPath(element, nodeI, nodeJ) : null;
      if (!path || path.length <= 2) {
        elements.push({ ...element, parent: element.id });
        expansion[element.id] = null;
        continue;
      }
      const nodeIds = [element.node_i];
      for (let index = 1; index < path.length - 1; index += 1) {
        const id = `${element.id}.n${index}`;
        nodes.push({
          id,
          x: path[index].x,
          y: path[index].y,
          restraints: { ux: false, uy: false, rz: false },
          support: { type: "free", angle: 0, mode: "free" },
          fused: true,
          generated: true,
          parent: element.id,
        });
        nodeIds.push(id);
      }
      nodeIds.push(element.node_j);
      const segments = [];
      let offset = 0;
      for (let index = 0; index < path.length - 1; index += 1) {
        const length = Math.hypot(path[index + 1].x - path[index].x, path[index + 1].y - path[index].y);
        const id = `${element.id}.s${index + 1}`;
        const first = index === 0;
        const last = index === path.length - 2;
        elements.push({
          ...element,
          id,
          node_i: nodeIds[index],
          node_j: nodeIds[index + 1],
          geometry: "straight",
          path: undefined,
          parent: element.id,
          moment_release_i: first && Boolean(element.moment_release_i),
          moment_release_j: last && Boolean(element.moment_release_j),
        });
        segments.push({ id, start: offset, length, from: path[index], to: path[index + 1] });
        offset += length;
      }
      expansion[element.id] = { segments, nodeIds, length: offset, geometry: geometryOf(element) };
    }

    for (const load of model.elementLoads || []) {
      const element = elementById.get(load.element);
      if (!element) continue;
      elementLoads.push(...expandDistributedLoad(load, element, nodeById, expansion[element.id]));
    }
    for (const load of model.loads || []) {
      if (load.kind !== "element_point" || !load.element) continue;
      const element = elementById.get(load.element);
      if (!element) continue;
      elementLoads.push(expandPointLoad(load, element, expansion[element.id]));
    }
    return { nodes, elements, elementLoads, expansion };
  }

  function expandDistributedLoad(load, element, nodeById, info) {
    if (!info) return [{ ...load }];
    if (load.kind === "uniform_moment_local") {
      return info.segments.map((segment) => ({ element: segment.id, kind: "uniform_moment_local", mz: load.mz || "0 N*m/m" }));
    }
    // Chord-local intensities are turned into global components, then into
    // the local axes of each straight segment; the intensity is sampled at
    // both segment ends by arc-length ratio and passed as a linear load.
    const chord = direction(nodeById.get(element.node_i), nodeById.get(element.node_j));
    const total = info.length || 1;
    return info.segments.map((segment) => {
      const dir = direction(segment.from, segment.to);
      const ends = [segment.start / total, (segment.start + segment.length) / total].map((ratio) => {
        const global = localToGlobal(chord, intensityAt(load, "x", ratio), intensityAt(load, "y", ratio));
        return globalToLocal(dir, global.x, global.y);
      });
      return {
        element: segment.id,
        kind: "linear_local",
        qx_i: formatQuantity(ends[0].qx, "N/m"),
        qy_i: formatQuantity(ends[0].qy, "N/m"),
        qx_j: formatQuantity(ends[1].qx, "N/m"),
        qy_j: formatQuantity(ends[1].qy, "N/m"),
      };
    });
  }

  function expandPointLoad(load, element, info) {
    const ratio = Math.max(0, Math.min(1, Number(load.ratio ?? 0.5)));
    if (!info) return pointLoadPayload(element.id, ratio, load);
    const position = ratio * info.length;
    let segment = info.segments[info.segments.length - 1];
    for (const candidate of info.segments) {
      if (position <= candidate.start + candidate.length + EPSILON) {
        segment = candidate;
        break;
      }
    }
    const localRatio = segment.length > 0 ? (position - segment.start) / segment.length : 0;
    return pointLoadPayload(segment.id, localRatio, load);
  }

  /**
   * Merge solver output for expanded members back onto their parents.
   * Generated sub-nodes are dropped from `displacements`; the untouched
   * solver payload is kept under `raw` for the deformed shape.
   */
  function mergeResult(payload, expansion) {
    const info = expansion || {};
    const parents = Object.keys(info);
    const generatedNodes = new Set();
    for (const parent of parents) {
      const item = info[parent];
      if (!item) continue;
      item.nodeIds.slice(1, -1).forEach((id) => generatedNodes.add(id));
    }
    if (!parents.some((id) => info[id])) return { ...payload, raw: payload };

    const merged = {
      ...payload,
      displacements: {},
      element_end_forces: {},
      element_diagrams: {},
      summary: { ...(payload.summary || {}) },
      raw: payload,
    };
    for (const [nodeId, values] of Object.entries(payload.displacements || {})) {
      if (!generatedNodes.has(nodeId)) merged.displacements[nodeId] = values;
    }
    const endForces = payload.element_end_forces || {};
    const diagrams = payload.element_diagrams || {};
    for (const [elementId, values] of Object.entries(endForces)) {
      if (!(elementId in info) && !segmentParent(elementId, info)) merged.element_end_forces[elementId] = values;
    }
    for (const [elementId, rows] of Object.entries(diagrams)) {
      if (!(elementId in info) && !segmentParent(elementId, info)) merged.element_diagrams[elementId] = rows;
    }
    for (const parent of parents) {
      const item = info[parent];
      if (!item) {
        if (endForces[parent]) merged.element_end_forces[parent] = endForces[parent];
        if (diagrams[parent]) merged.element_diagrams[parent] = diagrams[parent];
        continue;
      }
      const first = endForces[item.segments[0].id] || {};
      const last = endForces[item.segments[item.segments.length - 1].id] || {};
      merged.element_end_forces[parent] = {
        n_i: Number(first.n_i || 0),
        v_i: Number(first.v_i || 0),
        m_i: Number(first.m_i || 0),
        n_j: Number(last.n_j || 0),
        v_j: Number(last.v_j || 0),
        m_j: Number(last.m_j || 0),
      };
      const rows = [];
      for (const segment of item.segments) {
        for (const row of diagrams[segment.id] || []) {
          const x = segment.start + Number(row.x || 0);
          rows.push({ ...row, x, ratio: item.length > 0 ? x / item.length : 0, segment: segment.id });
        }
      }
      merged.element_diagrams[parent] = rows;
    }

    const dangerous = ((payload.summary || {}).dangerous_sections || []).map((section) => {
      const found = segmentParent(section.element, info);
      if (!found) return section;
      const x = found.segment.start + Number(section.x || 0);
      return { ...section, element: found.parent, x, ratio: found.info.length > 0 ? x / found.info.length : 0 };
    });
    merged.summary.dangerous_sections = dangerous;
    const zero = new Set((payload.summary || {}).zero_force_elements || []);
    merged.summary.zero_force_elements = parents.filter((parent) => {
      const item = info[parent];
      return item ? item.segments.every((segment) => zero.has(segment.id)) : zero.has(parent);
    });
    return merged;
  }

  function segmentParent(elementId, info) {
    for (const parent of Object.keys(info)) {
      const item = info[parent];
      if (!item) continue;
      const segment = item.segments.find((candidate) => candidate.id === elementId);
      if (segment) return { parent, segment, info: item };
    }
    return null;
  }

  return {
    CURVED_GEOMETRIES,
    geometryOf,
    isDiscretised,
    elementPath,
    pathLength,
    pathRatioAtPoint,
    pointAtPathRatio,
    expandModel,
    mergeResult,
    segmentParent,
  };
});
