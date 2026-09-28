"use strict";

(function exposeProjectSchema(root, factory) {
  const units = typeof module === "object" && module.exports ? require("./units.js") : root.Units;
  const api = factory(units);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ProjectSchema = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createProjectSchema(Units) {
  if (!Units || typeof Units.parseQuantity !== "function") {
    throw new Error("ProjectSchema requires Units.parseQuantity.");
  }

  const STATIC_SCHEMA = "cms-static-project@1";
  const DYNAMICS_SCHEMA = "cms-dynamics-project@2";
  const PREVIOUS_DYNAMICS_SCHEMA = "cms-dynamics-project@1";
  const APPLICATION_ID = "computational-mechanics-solver";
  const LEGACY_DYNAMICS_SCHEMA = "mechanics-dynamics-project@1";
  const LEGACY_GEOMETRIES = new Set(["arc", "tee", "freeform", "right_angle"]);
  const STATIC_ELEMENT_TYPES = new Set(["frame", "truss", "rigid"]);
  const STATIC_GEOMETRIES = new Set(["straight", "arc", "tee", "freeform", "right_angle"]);
  const STATIC_ELEMENT_LOADS = new Set([
    "uniform_local",
    "linear_local",
    "polynomial_local",
    "point_global",
    "uniform_moment_local",
  ]);
  const DYNAMICS_OBJECT_KINDS = new Set(["particle", "rod", "circle", "ring", "rectangle", "custom"]);
  const DYNAMICS_FIELD_KINDS = new Set(["gravity", "electric", "magnetic"]);
  const DYNAMICS_RANGE_TYPES = new Set(["global", "rectangle", "circle", "custom"]);
  const DYNAMICS_FORCE_TYPES = new Set(["impulse", "continuous"]);
  const DYNAMICS_MODELS = new Set(["independent-particle2d", "coupled-rigid-body2d"]);
  const DYNAMICS_CONTACT_KINDS = new Set(["particle", "circle"]);
  const DYNAMICS_TRACK_KINDS = new Set(["line", "incline", "polyline", "arc", "bezier"]);
  const DYNAMICS_ENDPOINT_BEHAVIORS = new Set(["release", "open", "stop", "reflect", "bounce"]);
  const DYNAMICS_EXPRESSION_MODES = new Set(["constant", "time", "space", "time-space"]);
  const DYNAMICS_FIELD_REPRESENTATIONS = new Set(["components", "magnitude-angle"]);
  const DYNAMICS_FIELD_UNITS = Object.freeze({ gravity: "m/s^2", electric: "N/C", magnetic: "T" });
  const GEOMETRY_EPSILON = 1e-9;

  function isPlainObject(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function deepClone(value) {
    if (Array.isArray(value)) return value.map(deepClone);
    if (isPlainObject(value)) {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, deepClone(item)]));
    }
    return value;
  }

  function assertPlainObject(value, label) {
    if (!isPlainObject(value)) throw new Error(`${label}必须是对象。`);
    return value;
  }

  function assertArray(value, label) {
    if (!Array.isArray(value)) throw new Error(`${label}必须是数组。`);
    return value;
  }

  function assertId(value, label) {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${label}必须是非空字符串。`);
    return value;
  }

  function assertUniqueIds(items, label) {
    const ids = new Set();
    items.forEach((item, index) => {
      assertPlainObject(item, `${label}第 ${index + 1} 项`);
      const id = assertId(item.id, `${label} ID`);
      if (ids.has(id)) throw new Error(`${label} ID ${id} 重复。`);
      ids.add(id);
    });
    return ids;
  }

  function assertFiniteNumber(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label}必须是有限数值。`);
    return number;
  }

  function assertPositiveNumber(value, label) {
    const number = assertFiniteNumber(value, label);
    if (!(number > 0)) throw new Error(`${label}必须大于 0。`);
    return number;
  }

  function assertNonNegativeNumber(value, label) {
    const number = assertFiniteNumber(value, label);
    if (number < 0) throw new Error(`${label}不能小于 0。`);
    return number;
  }

  function assertBoolean(value, label) {
    if (typeof value !== "boolean") throw new Error(`${label}必须是布尔值。`);
    return value;
  }

  function assertBoundedNumber(value, minimum, maximum, label) {
    const number = assertFiniteNumber(value, label);
    if (number < minimum || number > maximum) {
      throw new Error(`${label}必须在 [${minimum}, ${maximum}] 内。`);
    }
    return number;
  }

  function parseQuantity(value, defaultUnit, label) {
    let number;
    try {
      number = Units.parseQuantity(value, defaultUnit);
    } catch (error) {
      throw new Error(`${label} 无法解析：${String(error.message || error)}`);
    }
    if (!Number.isFinite(number)) throw new Error(`${label}必须是有限物理量。`);
    return number;
  }

  function assertPositiveQuantity(value, defaultUnit, label) {
    const number = parseQuantity(value, defaultUnit, label);
    if (!(number > 0)) throw new Error(`${label}必须大于 0。`);
    return number;
  }

  function assertPoint(point, label) {
    assertPlainObject(point, label);
    assertFiniteNumber(point.x, `${label}.x`);
    assertFiniteNumber(point.y, `${label}.y`);
  }

  function polygonArea(path) {
    let twiceArea = 0;
    for (let index = 0; index < path.length; index += 1) {
      const current = path[index];
      const next = path[(index + 1) % path.length];
      twiceArea += Number(current.x) * Number(next.y) - Number(next.x) * Number(current.y);
    }
    return Math.abs(twiceArea) / 2;
  }

  function migrateLegacyStaticLoads(project) {
    const loads = isPlainObject(project.loads) ? project.loads : { nodes: [], elements: [] };
    const nodeLoads = Array.isArray(loads.nodes) ? loads.nodes : [];
    const elementLoads = Array.isArray(loads.elements) ? loads.elements : [];
    const migratedNodes = [];
    const migratedElements = elementLoads.map((load) => {
      if (!isPlainObject(load)) return load;
      return load.kind === "element_point" ? { ...load, kind: "point_global" } : load;
    });
    for (const load of nodeLoads) {
      if (isPlainObject(load) && load.element) {
        migratedElements.push({ ...load, kind: load.kind === "element_point" ? "point_global" : load.kind });
      } else {
        migratedNodes.push(load);
      }
    }
    project.loads = { ...loads, nodes: migratedNodes, elements: migratedElements };
  }

  function normalizeReleaseFlags(project) {
    if (!Array.isArray(project.elements)) return;
    project.elements = project.elements.map((element) => {
      if (!isPlainObject(element) || element.type === "frame") return element;
      return { ...element, moment_release_i: false, moment_release_j: false };
    });
  }

  function migrateStaticProject(rawProject) {
    assertPlainObject(rawProject, "静力学工程根对象");
    const project = deepClone(rawProject);
    const hasSchema = project.schema !== undefined && project.schema !== null && project.schema !== "";
    if (hasSchema && project.schema !== STATIC_SCHEMA) {
      throw new Error(`不支持的静力学工程版本：${String(project.schema)}。`);
    }
    if (!hasSchema) {
      if (project.module && project.module !== "statics") {
        throw new Error(`工程模块 ${String(project.module)} 不能作为静力学工程打开。`);
      }
      project.schema = STATIC_SCHEMA;
      project.application = APPLICATION_ID;
      project.module = "statics";
      project.metadata = isPlainObject(project.metadata) ? project.metadata : {};
      project.solver = project.solver || project.metadata.solver || "frame2d";
      project.loads = isPlainObject(project.loads) ? project.loads : { nodes: [], elements: [] };
      project.loads.nodes = Array.isArray(project.loads.nodes) ? project.loads.nodes : [];
      project.loads.elements = Array.isArray(project.loads.elements) ? project.loads.elements : [];
      if (Array.isArray(project.elements)) {
        project.elements = project.elements.map((element) => {
          if (!isPlainObject(element)) return element;
          const legacyType = String(element.type || "frame");
          if (LEGACY_GEOMETRIES.has(legacyType)) {
            return { ...element, type: "frame", geometry: element.geometry || legacyType };
          }
          return { ...element, type: legacyType, geometry: element.geometry || "straight" };
        });
      }
      migrateLegacyStaticLoads(project);
    }
    normalizeReleaseFlags(project);
    return project;
  }

  function validateStaticMaterials(materials) {
    const ids = assertUniqueIds(materials, "材料");
    materials.forEach((material) => {
      if (material.E !== undefined) assertPositiveQuantity(material.E, "Pa", `材料 ${material.id} 的 E`);
      if (material.nu !== undefined) assertFiniteNumber(material.nu, `材料 ${material.id} 的 nu`);
    });
    return ids;
  }

  function validateStaticSections(sections) {
    const ids = assertUniqueIds(sections, "截面");
    sections.forEach((section) => {
      if (section.A !== undefined) assertPositiveQuantity(section.A, "m^2", `截面 ${section.id} 的 A`);
      if (section.I !== undefined) assertPositiveQuantity(section.I, "m^4", `截面 ${section.id} 的 I`);
      if (section.Ixy !== undefined) parseQuantity(section.Ixy, "m^4", `截面 ${section.id} 的 Ixy`);
      if (section.W !== undefined) parseQuantity(section.W, "m^3", `截面 ${section.id} 的 W`);
      if (section.Q !== undefined) parseQuantity(section.Q, "m^3", `截面 ${section.id} 的 Q`);
    });
    return ids;
  }

  function validateStaticNodes(nodes) {
    const ids = assertUniqueIds(nodes, "节点");
    nodes.forEach((node) => {
      parseQuantity(node.x ?? 0, "m", `节点 ${node.id} 的 x`);
      parseQuantity(node.y ?? 0, "m", `节点 ${node.id} 的 y`);
      if (node.support !== undefined) {
        assertPlainObject(node.support, `节点 ${node.id} 的 support`);
        if (node.support.angle !== undefined) assertFiniteNumber(node.support.angle, `节点 ${node.id} 的 support.angle`);
      }
    });
    return ids;
  }

  function validateStaticElements(elements, nodeIds, materialIds, sectionIds) {
    const ids = assertUniqueIds(elements, "单元");
    const byId = new Map();
    elements.forEach((element) => {
      const id = element.id;
      const nodeI = assertId(element.node_i, `单元 ${id} 的 node_i`);
      const nodeJ = assertId(element.node_j, `单元 ${id} 的 node_j`);
      if (!nodeIds.has(nodeI)) throw new Error(`单元 ${id} 引用了不存在的节点 ${nodeI}（node_i）。`);
      if (!nodeIds.has(nodeJ)) throw new Error(`单元 ${id} 引用了不存在的节点 ${nodeJ}（node_j）。`);
      if (nodeI === nodeJ) throw new Error(`单元 ${id} 的 node_i 与 node_j 不能相同。`);
      const material = assertId(element.material, `单元 ${id} 的 material`);
      const section = assertId(element.section, `单元 ${id} 的 section`);
      if (!materialIds.has(material)) throw new Error(`单元 ${id} 引用了不存在的材料 ${material}。`);
      if (!sectionIds.has(section)) throw new Error(`单元 ${id} 引用了不存在的截面 ${section}。`);
      const type = String(element.type || "");
      if (!STATIC_ELEMENT_TYPES.has(type)) throw new Error(`单元 ${id} 的 type ${type || "(空)"} 不受支持。`);
      const geometry = String(element.geometry || "");
      if (!STATIC_GEOMETRIES.has(geometry)) throw new Error(`单元 ${id} 的 geometry ${geometry || "(空)"} 不受支持。`);
      const releaseI = Boolean(element.moment_release_i);
      const releaseJ = Boolean(element.moment_release_j);
      if (type !== "frame" && (releaseI || releaseJ)) throw new Error(`${type} 单元 ${id} 不允许端部弯矩释放。`);
      if (type === "frame" && releaseI && releaseJ) throw new Error(`当前版本不支持单元 ${id} 双端弯矩释放。`);
      if (element.curvature !== undefined) assertFiniteNumber(element.curvature, `单元 ${id} 的 curvature`);
      if (element.arcAngle !== undefined) assertFiniteNumber(element.arcAngle, `单元 ${id} 的 arcAngle`);
      if (element.teeDepth !== undefined) parseQuantity(element.teeDepth, "m", `单元 ${id} 的 teeDepth`);
      if (element.sectionParams !== undefined) {
        assertPlainObject(element.sectionParams, `单元 ${id} 的 sectionParams`);
        const quantityFields = [
          ["sectionRadius", "m"],
          ["inertia", "m^4"],
          ["inertiaProduct", "m^4"],
          ["staticMoment", "m^3"],
          ["teeDepth", "m"],
        ];
        for (const [field, unit] of quantityFields) {
          if (element.sectionParams[field] !== undefined) {
            parseQuantity(element.sectionParams[field], unit, `单元 ${id} 的 sectionParams.${field}`);
          }
        }
      }
      if (element.path !== undefined && element.path !== null) {
        assertArray(element.path, `单元 ${id} 的 path`);
        element.path.forEach((point, index) => assertPoint(point, `单元 ${id} 的 path[${index}]`));
      }
      byId.set(id, element);
    });
    return { ids, byId };
  }

  function validateNodalLoad(load, index, nodeIds) {
    assertPlainObject(load, `节点荷载第 ${index + 1} 项`);
    const node = assertId(load.node, `节点荷载第 ${index + 1} 项的 node`);
    if (!nodeIds.has(node)) throw new Error(`节点荷载引用了不存在的节点 ${node}。`);
    if (load.fx !== undefined) parseQuantity(load.fx, "N", `节点 ${node} 荷载的 fx`);
    if (load.fy !== undefined) parseQuantity(load.fy, "N", `节点 ${node} 荷载的 fy`);
    if (load.mz !== undefined) parseQuantity(load.mz, "N*m", `节点 ${node} 荷载的 mz`);
  }

  function validateDistributedLoadQuantities(load, elementId) {
    if (load.kind === "uniform_local") {
      if (load.qx !== undefined) parseQuantity(load.qx, "N/m", `单元 ${elementId} 荷载的 qx`);
      if (load.qy !== undefined) parseQuantity(load.qy, "N/m", `单元 ${elementId} 荷载的 qy`);
      return;
    }
    if (load.kind === "linear_local") {
      for (const field of ["qx_i", "qx_j", "qy_i", "qy_j"]) {
        if (load[field] !== undefined) parseQuantity(load[field], "N/m", `单元 ${elementId} 荷载的 ${field}`);
      }
      return;
    }
    for (const field of ["qx_coefficients", "qy_coefficients"]) {
      const coefficients = load[field] ?? [];
      assertArray(coefficients, `单元 ${elementId} 荷载的 ${field}`);
      coefficients.forEach((value, index) => parseQuantity(value, "N/m", `单元 ${elementId} 荷载的 ${field}[${index}]`));
    }
  }

  function validateElementLoad(load, index, elementById) {
    assertPlainObject(load, `单元荷载第 ${index + 1} 项`);
    const elementId = assertId(load.element, `单元荷载第 ${index + 1} 项的 element`);
    const element = elementById.get(elementId);
    if (!element) throw new Error(`单元荷载引用了不存在的单元 ${elementId}。`);
    const kind = String(load.kind || "");
    if (!STATIC_ELEMENT_LOADS.has(kind)) throw new Error(`单元 ${elementId} 的荷载类型 ${kind || "(空)"} 不受支持。`);
    if (kind === "uniform_moment_local") {
      if (element.type === "truss") throw new Error(`桁架单元 ${elementId} 不允许均布力偶 uniform_moment_local。`);
      if (load.mz !== undefined) parseQuantity(load.mz, "N*m/m", `单元 ${elementId} 均布力偶的 mz`);
      return;
    }
    if (kind === "point_global") {
      const ratio = assertFiniteNumber(load.ratio, `单元 ${elementId} 集中荷载的 ratio`);
      if (ratio < 0 || ratio > 1) throw new Error(`单元 ${elementId} 集中荷载的 ratio 必须在 [0, 1] 内。`);
      if (element.type === "truss") throw new Error(`桁架单元 ${elementId} 不允许杆件中间集中荷载 point_global。`);
      if (load.fx !== undefined) parseQuantity(load.fx, "N", `单元 ${elementId} 集中荷载的 fx`);
      if (load.fy !== undefined) parseQuantity(load.fy, "N", `单元 ${elementId} 集中荷载的 fy`);
      if (load.mz !== undefined) parseQuantity(load.mz, "N*m", `单元 ${elementId} 集中荷载的 mz`);
      return;
    }
    validateDistributedLoadQuantities(load, elementId);
  }

  function validateStaticProject(project) {
    assertPlainObject(project, "静力学工程根对象");
    if (project.schema !== STATIC_SCHEMA) throw new Error(`静力学工程 schema 必须是 ${STATIC_SCHEMA}，实际为 ${String(project.schema)}。`);
    if (project.application !== APPLICATION_ID) {
      throw new Error(`静力学工程 application 必须是 ${APPLICATION_ID}，实际为 ${String(project.application)}。`);
    }
    if (project.module !== "statics") throw new Error(`静力学工程 module 必须是 statics，实际为 ${String(project.module)}。`);
    if (project.metadata !== undefined) assertPlainObject(project.metadata, "静力学工程 metadata");
    assertArray(project.materials, "静力学工程 materials");
    assertArray(project.sections, "静力学工程 sections");
    assertArray(project.nodes, "静力学工程 nodes");
    assertArray(project.elements, "静力学工程 elements");
    assertPlainObject(project.loads, "静力学工程 loads");
    assertArray(project.loads.nodes, "静力学工程 loads.nodes");
    assertArray(project.loads.elements, "静力学工程 loads.elements");
    const materialIds = validateStaticMaterials(project.materials);
    const sectionIds = validateStaticSections(project.sections);
    const nodeIds = validateStaticNodes(project.nodes);
    const { byId: elementById } = validateStaticElements(project.elements, nodeIds, materialIds, sectionIds);
    project.loads.nodes.forEach((load, index) => validateNodalLoad(load, index, nodeIds));
    project.loads.elements.forEach((load, index) => validateElementLoad(load, index, elementById));
    return project;
  }

  function migrateDynamicsProject(rawProject) {
    assertPlainObject(rawProject, "动力学工程根对象");
    const project = deepClone(rawProject);
    const schema = project.schema;
    const legacy =
      schema === undefined ||
      schema === null ||
      schema === "" ||
      schema === LEGACY_DYNAMICS_SCHEMA ||
      schema === PREVIOUS_DYNAMICS_SCHEMA;
    if (!legacy && schema !== DYNAMICS_SCHEMA) throw new Error(`不支持的动力学工程版本：${String(schema)}。`);
    if (legacy) {
      if (project.module !== "dynamics") {
        throw new Error(`旧动力学工程 module 必须是 dynamics，实际为 ${String(project.module)}。`);
      }
      project.schema = DYNAMICS_SCHEMA;
      project.application = APPLICATION_ID;
      project.model = project.model || "independent-particle2d";
      project.objects = (Array.isArray(project.objects) ? project.objects : []).map((object) => {
        if (!isPlainObject(object)) return object;
        const geometry = isPlainObject(object.geometry) ? object.geometry : {};
        const massProperties = isPlainObject(object.massProperties) ? object.massProperties : {};
        const initialState = isPlainObject(object.initialState) ? object.initialState : {};
        return {
          ...object,
          geometry: {
            ...geometry,
            kind: geometry.kind ?? object.kind,
            sizeA: geometry.sizeA ?? object.sizeA,
            sizeB: geometry.sizeB ?? object.sizeB,
            sizeC: geometry.sizeC ?? object.sizeC,
            collisionRadius: geometry.collisionRadius ?? object.collisionRadius,
            path: geometry.path ?? object.path,
            equation: geometry.equation ?? object.equation,
          },
          massProperties: {
            ...massProperties,
            mass: massProperties.mass ?? object.mass,
            density: massProperties.density ?? object.density,
            charge: massProperties.charge ?? object.charge,
            inertia: massProperties.inertia ?? object.inertia,
            centerOfMass: massProperties.centerOfMass ?? object.centerOfMass,
          },
          initialState: {
            ...initialState,
            x: initialState.x ?? object.x,
            y: initialState.y ?? object.y,
            vx: initialState.vx ?? object.vx0,
            vy: initialState.vy ?? object.vy0,
            theta: initialState.theta ?? object.theta0 ?? object.angle ?? 0,
            omega: initialState.omega ?? object.omega0 ?? object.angularVelocity ?? 0,
          },
        };
      });
      project.forces = (Array.isArray(project.forces) ? project.forces : []).map((force) => {
        if (!isPlainObject(force)) return force;
        const legacyPoint = isPlainObject(force.applicationPoint)
          ? force.applicationPoint
          : isPlainObject(force.localPoint)
            ? { ...force.localPoint, frame: "local" }
            : isPlainObject(force.point)
              ? force.point
              : { frame: "local", x: 0, y: 0 };
        return {
          ...force,
          applicationPoint: {
            frame: legacyPoint.frame === "world" ? "world" : "local",
            x: Number(legacyPoint.x ?? 0),
            y: Number(legacyPoint.y ?? 0),
          },
        };
      });
      project.tracks = Array.isArray(project.tracks) ? project.tracks : [];
      project.grounds = Array.isArray(project.grounds) ? project.grounds : [];
      project.constraints = Array.isArray(project.constraints) ? project.constraints : [];
    }
    return project;
  }

  function dynamicsObjectValue(object, nestedGroup, nestedField, flatField) {
    const nested = isPlainObject(object[nestedGroup]) ? object[nestedGroup][nestedField] : undefined;
    return nested ?? object[flatField];
  }

  function validateContactMaterial(material, label) {
    if (material === undefined || material === null) return;
    assertPlainObject(material, label);
    if (material.enabled !== undefined) assertBoolean(material.enabled, `${label}.enabled`);
    if (material.restitution !== undefined) {
      assertBoundedNumber(material.restitution, 0, 1, `${label}.restitution`);
    }
    const staticFriction =
      material.staticFriction === undefined
        ? undefined
        : assertNonNegativeNumber(material.staticFriction, `${label}.staticFriction`);
    const dynamicFriction =
      material.dynamicFriction === undefined
        ? undefined
        : assertNonNegativeNumber(material.dynamicFriction, `${label}.dynamicFriction`);
    if (staticFriction !== undefined && dynamicFriction !== undefined && staticFriction < dynamicFriction) {
      throw new Error(`${label}.staticFriction 不能小于 dynamicFriction。`);
    }
    if (material.damping !== undefined) assertNonNegativeNumber(material.damping, `${label}.damping`);
  }

  function validateApplicationPoint(point, label) {
    if (point === undefined || point === null) return;
    assertPlainObject(point, label);
    const frame = String(point.frame || "local");
    if (!new Set(["local", "world"]).has(frame)) throw new Error(`${label}.frame 必须是 local 或 world。`);
    assertFiniteNumber(point.x ?? 0, `${label}.x`);
    assertFiniteNumber(point.y ?? 0, `${label}.y`);
  }

  function validateDynamicsObject(object, index) {
    assertPlainObject(object, `动力学对象第 ${index + 1} 项`);
    const id = assertId(object.id, `动力学对象第 ${index + 1} 项的 ID`);
    const kind = String(dynamicsObjectValue(object, "geometry", "kind", "kind") || "");
    if (!DYNAMICS_OBJECT_KINDS.has(kind)) throw new Error(`动力学对象 ${id} 的 kind ${kind || "(空)"} 不受支持。`);
    const mass = dynamicsObjectValue(object, "massProperties", "mass", "mass");
    assertPositiveNumber(mass, `动力学对象 ${id} 的 mass`);
    const density = dynamicsObjectValue(object, "massProperties", "density", "density");
    const charge = dynamicsObjectValue(object, "massProperties", "charge", "charge");
    if (density !== undefined) assertNonNegativeNumber(density, `动力学对象 ${id} 的 density`);
    if (charge !== undefined) assertFiniteNumber(charge, `动力学对象 ${id} 的 charge`);
    for (const [nestedField, flatField] of [["x", "x"], ["y", "y"], ["vx", "vx0"], ["vy", "vy0"]]) {
      const value = dynamicsObjectValue(object, "initialState", nestedField, flatField);
      assertFiniteNumber(value, `动力学对象 ${id} 的 ${flatField}`);
    }
    for (const field of ["sizeA", "sizeB", "sizeC"]) {
      const value = dynamicsObjectValue(object, "geometry", field, field);
      if (value !== undefined) assertPositiveNumber(value, `动力学对象 ${id} 的 ${field}`);
    }
    const path = dynamicsObjectValue(object, "geometry", "path", "path");
    if (path !== undefined && path !== null) {
      assertArray(path, `动力学对象 ${id} 的 path`);
      path.forEach((point, pointIndex) => assertPoint(point, `动力学对象 ${id} 的 path[${pointIndex}]`));
    }
    if (object.name !== undefined && typeof object.name !== "string") throw new Error(`动力学对象 ${id} 的 name 必须是字符串。`);
    if (object.materialE !== undefined) assertNonNegativeNumber(object.materialE, `动力学对象 ${id} 的 materialE`);
    const equation = dynamicsObjectValue(object, "geometry", "equation", "equation");
    if (equation !== undefined && typeof equation !== "string") {
      throw new Error(`动力学对象 ${id} 的 equation 必须是字符串。`);
    }
    const theta = dynamicsObjectValue(object, "initialState", "theta", "theta0");
    const omega = dynamicsObjectValue(object, "initialState", "omega", "omega0");
    if (theta !== undefined) assertFiniteNumber(theta, `动力学对象 ${id} 的 theta0`);
    if (omega !== undefined) assertFiniteNumber(omega, `动力学对象 ${id} 的 omega0`);
    const inertia = dynamicsObjectValue(object, "massProperties", "inertia", "inertia");
    if (inertia !== undefined) assertPositiveNumber(inertia, `动力学对象 ${id} 的 inertia`);
    const centerOfMass = dynamicsObjectValue(object, "massProperties", "centerOfMass", "centerOfMass");
    if (centerOfMass !== undefined) assertPoint(centerOfMass, `动力学对象 ${id} 的 centerOfMass`);
    const collisionRadius =
      dynamicsObjectValue(object, "geometry", "collisionRadius", "collisionRadius") ??
      (kind === "particle" ? dynamicsObjectValue(object, "geometry", "sizeB", "sizeB") : undefined);
    if (collisionRadius !== undefined) {
      assertPositiveNumber(collisionRadius, `动力学对象 ${id} 的 collisionRadius`);
    }
    validateContactMaterial(object.contact, `动力学对象 ${id} 的 contact`);
    if (object.contact?.enabled) {
      if (!DYNAMICS_CONTACT_KINDS.has(kind)) {
        throw new Error(`动力学对象 ${id} 的几何 ${kind} 尚未实现碰撞，不能启用 contact。`);
      }
      if (kind === "particle" && collisionRadius === undefined) {
        throw new Error(`动力学质点 ${id} 启用 contact 时必须提供 collisionRadius。`);
      }
    }
  }

  function validateFieldVariation(field, id) {
    const variation = field.variation ?? field.expression;
    if (variation === undefined || variation === null) return false;
    assertPlainObject(variation, `动力场 ${id} 的 variation`);
    const mode = String(variation.mode || "");
    if (!DYNAMICS_EXPRESSION_MODES.has(mode)) {
      throw new Error(`动力场 ${id} 的 variation.mode ${mode || "(空)"} 不受支持。`);
    }
    const representation = String(variation.representation || "components");
    if (!DYNAMICS_FIELD_REPRESENTATIONS.has(representation) || (field.kind === "magnetic" && representation !== "components")) {
      throw new Error(`动力场 ${id} 的 variation.representation ${representation} 不受支持。`);
    }
    const expectedUnit = DYNAMICS_FIELD_UNITS[field.kind];
    const expressions = variation.expressions ?? variation.components;
    assertPlainObject(expressions, `动力场 ${id} 的 variation.expressions`);
    const units = variation.units;
    if (units !== undefined) assertPlainObject(units, `动力场 ${id} 的 variation.units`);
    const permitted =
      field.kind === "magnetic" ? ["z"] : representation === "magnitude-angle" ? ["magnitude", "angle"] : ["x", "y"];
    for (const required of permitted) {
      if (typeof expressions[required] !== "string" || !expressions[required].trim()) {
        throw new Error(`动力场 ${id} 的 variation.expressions.${required} 必须是非空表达式。`);
      }
    }
    for (const [component, expression] of Object.entries(expressions)) {
      if (!permitted.includes(component)) throw new Error(`动力场 ${id} 不允许表达式分量 ${component}。`);
      if (typeof expression !== "string" || !expression.trim()) {
        throw new Error(`动力场 ${id} 的 ${component} 分量表达式必须是非空字符串。`);
      }
      if (expression.length > 512) throw new Error(`动力场 ${id} 的 ${component} 分量表达式超过 512 字符上限。`);
    }
    const fieldUnit = units?.[permitted[0]] ?? variation.unit;
    if (String(fieldUnit || "") !== expectedUnit) {
      throw new Error(`动力场 ${id} 的 variation 场分量单位必须是 ${expectedUnit}。`);
    }
    if (representation === "magnitude-angle" && String(units?.angle ?? variation.angleUnit ?? "deg") !== "deg") {
      throw new Error(`动力场 ${id} 的角度表达式单位必须是 deg。`);
    }
    return true;
  }

  function validateDynamicsField(field, index) {
    assertPlainObject(field, `动力场第 ${index + 1} 项`);
    const id = assertId(field.id, `动力场第 ${index + 1} 项的 ID`);
    const kind = String(field.kind || "");
    if (!DYNAMICS_FIELD_KINDS.has(kind)) throw new Error(`动力场 ${id} 的 kind ${kind || "(空)"} 不受支持。`);
    const hasVariation = validateFieldVariation(field, id);
    if (field.magnitude !== undefined) {
      assertNonNegativeNumber(field.magnitude, `动力场 ${id} 的 magnitude`);
    } else if (!hasVariation) {
      throw new Error(`动力场 ${id} 必须提供 magnitude 或受控 variation。`);
    }
    if (field.angle !== undefined) assertFiniteNumber(field.angle, `动力场 ${id} 的 angle`);
    const rangeType = String(field.rangeType || "");
    if (!DYNAMICS_RANGE_TYPES.has(rangeType)) throw new Error(`动力场 ${id} 的 rangeType ${rangeType || "(空)"} 不受支持。`);
    if (rangeType !== "global") {
      assertFiniteNumber(field.centerX ?? 0, `动力场 ${id} 的 centerX`);
      assertFiniteNumber(field.centerY ?? 0, `动力场 ${id} 的 centerY`);
    }
    if (rangeType === "rectangle") {
      assertPositiveNumber(field.width, `动力场 ${id} 的 width`);
      assertPositiveNumber(field.height, `动力场 ${id} 的 height`);
    } else if (rangeType === "circle") {
      assertPositiveNumber(field.radius, `动力场 ${id} 的 radius`);
    } else if (rangeType === "custom") {
      assertArray(field.path, `动力场 ${id} 的 path`);
      if (field.path.length < 3) throw new Error(`动力场 ${id} 的 custom path 至少需要 3 个点。`);
      field.path.forEach((point, pointIndex) => assertPoint(point, `动力场 ${id} 的 path[${pointIndex}]`));
      if (!(polygonArea(field.path) > GEOMETRY_EPSILON)) {
        throw new Error(`动力场 ${id} 的 custom path 必须围成非零面积的有效区域。`);
      }
    }
    if (kind === "magnetic" && field.magneticDirection !== undefined && !["in", "out"].includes(field.magneticDirection)) {
      throw new Error(`动力场 ${id} 的 magneticDirection 必须是 in 或 out。`);
    }
  }

  function validateDynamicsForce(force, index, objectIds) {
    assertPlainObject(force, `外力第 ${index + 1} 项`);
    const id = assertId(force.id, `外力第 ${index + 1} 项的 ID`);
    const targetId = assertId(force.targetId, `外力 ${id} 的 targetId`);
    if (!objectIds.has(targetId)) throw new Error(`外力 ${id} 引用了不存在的对象 ${targetId}。`);
    const type = String(force.type || "");
    if (!DYNAMICS_FORCE_TYPES.has(type)) throw new Error(`外力 ${id} 的 type ${type || "(空)"} 不受支持。`);
    assertFiniteNumber(force.x, `外力 ${id} 的 x`);
    assertFiniteNumber(force.y, `外力 ${id} 的 y`);
    if (type === "continuous") {
      assertNonNegativeNumber(force.start ?? 0, `外力 ${id} 的 start`);
      assertNonNegativeNumber(force.duration ?? 0, `外力 ${id} 的 duration`);
    }
    validateApplicationPoint(force.applicationPoint, `外力 ${id} 的 applicationPoint`);
  }

  function validateDynamicsGround(ground, index) {
    assertPlainObject(ground, `接触地面第 ${index + 1} 项`);
    const id = assertId(ground.id, `接触地面第 ${index + 1} 项的 ID`);
    assertPoint(ground.normal, `接触地面 ${id} 的 normal`);
    if (!(Math.hypot(Number(ground.normal.x), Number(ground.normal.y)) > GEOMETRY_EPSILON)) {
      throw new Error(`接触地面 ${id} 的 normal 不能是零向量。`);
    }
    assertFiniteNumber(ground.offset ?? 0, `接触地面 ${id} 的 offset`);
    validateContactMaterial(ground.contact ?? ground.material, `接触地面 ${id} 的 contact`);
  }

  function validateTrackGeometry(track, id) {
    const geometry = isPlainObject(track.geometry) ? track.geometry : track;
    if (track.kind === "line" || track.kind === "incline") {
      assertPoint(geometry.start, `轨道 ${id} 的 start`);
      assertPoint(geometry.end, `轨道 ${id} 的 end`);
      if (Math.hypot(geometry.end.x - geometry.start.x, geometry.end.y - geometry.start.y) <= GEOMETRY_EPSILON) {
        throw new Error(`轨道 ${id} 的起点与终点不能重合。`);
      }
      return;
    }
    if (track.kind === "polyline") {
      assertArray(geometry.points, `轨道 ${id} 的 points`);
      if (geometry.points.length < 2) throw new Error(`轨道 ${id} 的 points 至少需要 2 个点。`);
      geometry.points.forEach((point, pointIndex) => assertPoint(point, `轨道 ${id} 的 points[${pointIndex}]`));
      return;
    }
    if (track.kind === "arc") {
      assertPoint(geometry.center, `轨道 ${id} 的 center`);
      assertPositiveNumber(geometry.radius, `轨道 ${id} 的 radius`);
      assertFiniteNumber(geometry.startAngle, `轨道 ${id} 的 startAngle`);
      assertFiniteNumber(geometry.endAngle, `轨道 ${id} 的 endAngle`);
      return;
    }
    for (const pointName of ["start", "control1", "control2", "end"]) {
      assertPoint(geometry[pointName], `轨道 ${id} 的 ${pointName}`);
    }
  }

  function validateDynamicsTrack(track, index, objectIds) {
    assertPlainObject(track, `轨道第 ${index + 1} 项`);
    const id = assertId(track.id, `轨道第 ${index + 1} 项的 ID`);
    const kind = String(track.kind || "");
    if (!DYNAMICS_TRACK_KINDS.has(kind)) throw new Error(`轨道 ${id} 的 kind ${kind || "(空)"} 不受支持。`);
    if (track.bodyId !== undefined) {
      const bodyId = assertId(track.bodyId, `轨道 ${id} 的 bodyId`);
      if (!objectIds.has(bodyId)) throw new Error(`轨道 ${id} 引用了不存在的对象 ${bodyId}。`);
    }
    validateTrackGeometry(track, id);
    validateContactMaterial(track.contact ?? track.material, `轨道 ${id} 的 contact`);
    const endpointBehavior = String(track.endpointBehavior || "release");
    if (!DYNAMICS_ENDPOINT_BEHAVIORS.has(endpointBehavior)) {
      throw new Error(`轨道 ${id} 的 endpointBehavior ${endpointBehavior} 不受支持。`);
    }
    if (track.rolling !== undefined) assertBoolean(track.rolling, `轨道 ${id} 的 rolling`);
  }

  function validateDynamicsConstraint(constraint, index, objectIds, trackIds) {
    assertPlainObject(constraint, `约束第 ${index + 1} 项`);
    const id = assertId(constraint.id, `约束第 ${index + 1} 项的 ID`);
    const bodyId = assertId(constraint.bodyId, `约束 ${id} 的 bodyId`);
    const trackId = assertId(constraint.trackId, `约束 ${id} 的 trackId`);
    if (!objectIds.has(bodyId)) throw new Error(`约束 ${id} 引用了不存在的对象 ${bodyId}。`);
    if (!trackIds.has(trackId)) throw new Error(`约束 ${id} 引用了不存在的轨道 ${trackId}。`);
    if (constraint.rolling !== undefined) assertBoolean(constraint.rolling, `约束 ${id} 的 rolling`);
  }

  function validateDynamicsProject(project) {
    assertPlainObject(project, "动力学工程根对象");
    if (project.schema !== DYNAMICS_SCHEMA) throw new Error(`动力学工程 schema 必须是 ${DYNAMICS_SCHEMA}，实际为 ${String(project.schema)}。`);
    if (project.application !== APPLICATION_ID) {
      throw new Error(`动力学工程 application 必须是 ${APPLICATION_ID}，实际为 ${String(project.application)}。`);
    }
    if (project.module !== "dynamics") throw new Error(`动力学工程 module 必须是 dynamics，实际为 ${String(project.module)}。`);
    if (!DYNAMICS_MODELS.has(project.model)) {
      throw new Error(`动力学工程 model ${String(project.model)} 不受支持。`);
    }
    assertPlainObject(project.simulation, "动力学工程 simulation");
    assertPositiveQuantity(project.simulation.duration, "s", "动力学工程 simulation.duration");
    assertPositiveQuantity(project.simulation.timeStep, "s", "动力学工程 simulation.timeStep");
    if (project.simulation.maxSubsteps !== undefined) {
      const maxSubsteps = assertPositiveNumber(project.simulation.maxSubsteps, "动力学工程 simulation.maxSubsteps");
      if (!Number.isInteger(maxSubsteps) || maxSubsteps > 4096) {
        throw new Error("动力学工程 simulation.maxSubsteps 必须是 1 到 4096 的整数。");
      }
    }
    if (project.simulation.contactIterations !== undefined) {
      const iterations = assertPositiveNumber(
        project.simulation.contactIterations,
        "动力学工程 simulation.contactIterations"
      );
      if (!Number.isInteger(iterations) || iterations > 128) {
        throw new Error("动力学工程 simulation.contactIterations 必须是 1 到 128 的整数。");
      }
    }
    assertArray(project.objects, "动力学工程 objects");
    assertArray(project.fields, "动力学工程 fields");
    assertArray(project.forces, "动力学工程 forces");
    const grounds = project.grounds ?? [];
    const tracks = project.tracks ?? [];
    const constraints = project.constraints ?? [];
    assertArray(grounds, "动力学工程 grounds");
    assertArray(tracks, "动力学工程 tracks");
    assertArray(constraints, "动力学工程 constraints");
    const objectIds = assertUniqueIds(project.objects, "动力学对象");
    project.objects.forEach(validateDynamicsObject);
    if (project.model === "coupled-rigid-body2d") {
      project.objects.forEach((object) => {
        const kind = String(dynamicsObjectValue(object, "geometry", "kind", "kind") || "");
        if (object.contact?.enabled !== false && !DYNAMICS_CONTACT_KINDS.has(kind)) {
          throw new Error(`耦合动力学对象 ${object.id} 的几何 ${kind} 尚未实现碰撞；请禁用 contact 或改用圆/带半径质点。`);
        }
      });
    }
    assertUniqueIds(project.fields, "动力场");
    project.fields.forEach(validateDynamicsField);
    assertUniqueIds(project.forces, "外力");
    project.forces.forEach((force, index) => validateDynamicsForce(force, index, objectIds));
    assertUniqueIds(grounds, "接触地面");
    grounds.forEach(validateDynamicsGround);
    const trackIds = assertUniqueIds(tracks, "轨道");
    tracks.forEach((track, index) => validateDynamicsTrack(track, index, objectIds));
    assertUniqueIds(constraints, "约束");
    constraints.forEach((constraint, index) => validateDynamicsConstraint(constraint, index, objectIds, trackIds));
    return project;
  }

  function loadStaticProject(rawProject) {
    const migrated = migrateStaticProject(deepClone(rawProject));
    validateStaticProject(migrated);
    return migrated;
  }

  function loadDynamicsProject(rawProject) {
    const migrated = migrateDynamicsProject(deepClone(rawProject));
    validateDynamicsProject(migrated);
    return migrated;
  }

  return {
    STATIC_SCHEMA,
    DYNAMICS_SCHEMA,
    PREVIOUS_DYNAMICS_SCHEMA,
    APPLICATION_ID,
    migrateStaticProject,
    migrateDynamicsProject,
    validateStaticProject,
    validateDynamicsProject,
    loadStaticProject,
    loadDynamicsProject,
  };
});
