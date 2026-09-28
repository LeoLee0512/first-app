"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const Geometry = require("../web/geometry-discretize.js");

const nodes = [
  { id: "A", x: 0, y: 0, restraints: { ux: true, uy: true, rz: true } },
  { id: "B", x: 3, y: 2, restraints: { ux: false, uy: false, rz: false } },
];
const rightAngle = { id: "E1", node_i: "A", node_j: "B", type: "frame", geometry: "right_angle", moment_release_j: true };

test("right-angle path goes through the elbow and has two segments", () => {
  const path = Geometry.elementPath(rightAngle, nodes[0], nodes[1]);
  assert.deepEqual(path, [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 2 }]);
  assert.equal(Geometry.pathLength(path), 5);
});

test("arc path keeps the end nodes and bulges towards the drawn side", () => {
  const arc = { id: "E2", node_i: "A", node_j: "B", type: "frame", geometry: "arc", curvature: 0.25 };
  const path = Geometry.elementPath(arc, { x: 0, y: 0 }, { x: 4, y: 0 });
  assert.deepEqual(path[0], { x: 0, y: 0 });
  assert.deepEqual(path[path.length - 1], { x: 4, y: 0 });
  assert.ok(path.length >= 9);
  // Screen normal (-dy, dx) with y down maps to world (dy, -dx): the control
  // point of a left-to-right chord lies below the chord.
  const mid = path[Math.floor(path.length / 2)];
  assert.ok(mid.y < 0);
  assert.ok(Geometry.pathLength(path) > 4);
});

test("tee and straight members are not discretised", () => {
  assert.equal(Geometry.isDiscretised({ geometry: "tee" }), false);
  assert.equal(Geometry.isDiscretised({ geometry: "straight" }), false);
  assert.equal(Geometry.isDiscretised({ type: "arc" }), true);
});

test("expandModel splits a right angle into sub-nodes and sub-elements with parent", () => {
  const model = { nodes, elements: [rightAngle], loads: [], elementLoads: [] };
  const expanded = Geometry.expandModel(model);
  assert.deepEqual(expanded.nodes.map((node) => node.id), ["A", "B", "E1.n1"]);
  const generated = expanded.nodes[2];
  assert.equal(generated.x, 3);
  assert.equal(generated.y, 0);
  assert.equal(generated.fused, true);
  assert.deepEqual(generated.restraints, { ux: false, uy: false, rz: false });
  assert.deepEqual(expanded.elements.map((element) => [element.id, element.node_i, element.node_j, element.parent]), [
    ["E1.s1", "A", "E1.n1", "E1"],
    ["E1.s2", "E1.n1", "B", "E1"],
  ]);
  // The release at end j only lands on the last segment.
  assert.equal(expanded.elements[0].moment_release_j, false);
  assert.equal(expanded.elements[1].moment_release_j, true);
  assert.equal(expanded.elements[0].geometry, "straight");
  assert.equal(expanded.expansion.E1.segments.length, 2);
  assert.equal(expanded.expansion.E1.length, 5);
});

test("distributed loads are converted from chord-local to segment-local by arc length", () => {
  // A vertical -5 kN/m load expressed in chord-local axes of the (3, 2) chord.
  const length = Math.hypot(3, 2);
  const c = 3 / length;
  const s = 2 / length;
  const load = { element: "E1", kind: "uniform_local", qx: `${s * -5000} N/m`, qy: `${c * -5000} N/m` };
  const expanded = Geometry.expandModel({ nodes, elements: [rightAngle], loads: [], elementLoads: [load] });
  assert.equal(expanded.elementLoads.length, 2);
  const [horizontal, vertical] = expanded.elementLoads;
  const num = (text) => Number(String(text).split(" ")[0]);
  assert.equal(horizontal.element, "E1.s1");
  assert.equal(horizontal.kind, "linear_local");
  assert.ok(Math.abs(num(horizontal.qx_i)) < 1e-6);
  assert.ok(Math.abs(num(horizontal.qy_i) + 5000) < 1e-6);
  assert.ok(Math.abs(num(horizontal.qy_j) + 5000) < 1e-6);
  // The vertical leg (local x pointing up) sees the load as axial -5000 N/m.
  assert.equal(vertical.element, "E1.s2");
  assert.ok(Math.abs(num(vertical.qx_i) + 5000) < 1e-6);
  assert.ok(Math.abs(num(vertical.qy_i)) < 1e-6);
});

test("uniform couples are copied onto every segment", () => {
  const load = { element: "E1", kind: "uniform_moment_local", mz: "2 kN*m/m" };
  const expanded = Geometry.expandModel({ nodes, elements: [rightAngle], loads: [], elementLoads: [load] });
  assert.deepEqual(expanded.elementLoads, [
    { element: "E1.s1", kind: "uniform_moment_local", mz: "2 kN*m/m" },
    { element: "E1.s2", kind: "uniform_moment_local", mz: "2 kN*m/m" },
  ]);
});

test("element point loads are located on the segment by arc length", () => {
  const load = { kind: "element_point", element: "E1", ratio: 0.5, fx: "0 N", fy: "-10 kN", mz: "0 N*m" };
  const expanded = Geometry.expandModel({ nodes, elements: [rightAngle], loads: [load], elementLoads: [] });
  assert.equal(expanded.elementLoads.length, 1);
  const mapped = expanded.elementLoads[0];
  assert.equal(mapped.element, "E1.s1");
  assert.equal(mapped.kind, "point_global");
  assert.ok(Math.abs(mapped.ratio - 2.5 / 3) < 1e-6);
  assert.equal(mapped.fy, "-10 kN");
  const far = Geometry.expandModel({ nodes, elements: [rightAngle], loads: [{ ...load, ratio: 0.9 }], elementLoads: [] });
  assert.equal(far.elementLoads[0].element, "E1.s2");
  assert.ok(Math.abs(far.elementLoads[0].ratio - 1.5 / 2) < 1e-6);
});

test("straight members pass point loads through unchanged", () => {
  const straight = { id: "E3", node_i: "A", node_j: "B", type: "frame", geometry: "straight" };
  const load = { kind: "element_point", element: "E3", ratio: 0.25, fx: "1 kN", fy: "0 N", mz: "0 N*m" };
  const expanded = Geometry.expandModel({ nodes, elements: [straight], loads: [load], elementLoads: [] });
  assert.equal(expanded.expansion.E3, null);
  assert.deepEqual(expanded.elementLoads, [{ element: "E3", kind: "point_global", ratio: 0.25, fx: "1 kN", fy: "0 N", mz: "0 N*m" }]);
});

test("path ratio and point on path are consistent along the elbow", () => {
  const path = [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 2 }];
  assert.ok(Math.abs(Geometry.pathRatioAtPoint(path, { x: 3, y: 1 }) - 4 / 5) < 1e-9);
  assert.ok(Math.abs(Geometry.pathRatioAtPoint(path, { x: 1.5, y: 0.3 }) - 1.5 / 5) < 1e-9);
  assert.deepEqual(Geometry.pointAtPathRatio(path, 0.8), { x: 3, y: 1 });
  assert.deepEqual(Geometry.pointAtPathRatio(path, 0), { x: 0, y: 0 });
  assert.deepEqual(Geometry.pointAtPathRatio(path, 1), { x: 3, y: 2 });
});

test("mergeResult concatenates diagrams, takes end forces from first/last segment and maps summary", () => {
  const expansion = {
    E1: {
      geometry: "right_angle",
      length: 5,
      nodeIds: ["A", "E1.n1", "B"],
      segments: [
        { id: "E1.s1", start: 0, length: 3, from: { x: 0, y: 0 }, to: { x: 3, y: 0 } },
        { id: "E1.s2", start: 3, length: 2, from: { x: 3, y: 0 }, to: { x: 3, y: 2 } },
      ],
    },
    E9: null,
  };
  const payload = {
    displacements: { A: { ux: 0, uy: 0, rz: 0 }, "E1.n1": { ux: 1, uy: 2, rz: 3 }, B: { ux: 4, uy: 5, rz: 6 } },
    reactions: { A: { fx: 0, fy: 10, mz: 30 } },
    element_end_forces: {
      "E1.s1": { n_i: 1, v_i: 2, m_i: 3, n_j: 4, v_j: 5, m_j: 6 },
      "E1.s2": { n_i: 7, v_i: 8, m_i: 9, n_j: 10, v_j: 11, m_j: 12 },
      E9: { n_i: 0, v_i: 0, m_i: 0, n_j: 0, v_j: 0, m_j: 0 },
    },
    element_diagrams: {
      "E1.s1": [{ x: 0, ratio: 0, n: 0, v: 0, m: 30 }, { x: 3, ratio: 1, n: 0, v: 0, m: 0 }],
      "E1.s2": [{ x: 0, ratio: 0, n: -10, v: 0, m: 0 }, { x: 2, ratio: 1, n: -10, v: 0, m: 0 }],
      E9: [{ x: 0, ratio: 0, n: 0, v: 0, m: 0 }],
    },
    summary: {
      dangerous_sections: [{ element: "E1.s1", x: 0, ratio: 0, moment: 30, abs_moment: 30 }],
      zero_force_elements: ["E9", "E1.s2"],
    },
  };
  const merged = Geometry.mergeResult(payload, expansion);
  assert.deepEqual(Object.keys(merged.displacements).sort(), ["A", "B"]);
  assert.deepEqual(merged.element_end_forces.E1, { n_i: 1, v_i: 2, m_i: 3, n_j: 10, v_j: 11, m_j: 12 });
  assert.deepEqual(merged.element_end_forces.E9, payload.element_end_forces.E9);
  assert.deepEqual(merged.element_diagrams.E1.map((row) => [row.x, row.ratio]), [[0, 0], [3, 0.6], [3, 0.6], [5, 1]]);
  assert.equal("E1.s1" in merged.element_diagrams, false);
  assert.deepEqual(merged.summary.dangerous_sections, [{ element: "E1", x: 0, ratio: 0, moment: 30, abs_moment: 30 }]);
  assert.deepEqual(merged.summary.zero_force_elements, ["E9"]);
  assert.equal(merged.raw, payload);
  assert.equal(merged.reactions, payload.reactions);
});

test("mergeResult without expansion keeps the payload and attaches raw", () => {
  const payload = { displacements: {}, element_end_forces: {}, element_diagrams: {}, summary: {} };
  const merged = Geometry.mergeResult(payload, { E1: null });
  assert.equal(merged.raw, payload);
  assert.equal(merged.displacements, payload.displacements);
});
