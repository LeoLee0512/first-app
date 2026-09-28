"use strict";

const assert = require("node:assert/strict");
const adapter = require("../web/project-adapter.js");

function staticProject() {
  return {
    schema: adapter.STATIC_SCHEMA,
    application: adapter.APPLICATION_ID,
    module: "statics",
    metadata: { name: "round-trip", owner: "test" },
    solver: "frame2d",
    materials: [{ id: "steel", E: "200 GPa", nu: 0.3 }],
    sections: [{ id: "default", A: "10000 mm^2", I: "80000000 mm^4" }],
    nodes: [
      {
        id: "N1",
        x: "0 m",
        y: "0 m",
        restraints: ["ux", "uy", "rz"],
        support: { type: "fixed", mode: "fixed", angle: 37 },
      },
      { id: "N2", x: "4 m", y: "0 m", restraints: [] },
    ],
    elements: [
      {
        id: "E1",
        node_i: "N1",
        node_j: "N2",
        material: "steel",
        section: "default",
        type: "frame",
        geometry: "straight",
        moment_release_i: false,
        moment_release_j: true,
      },
    ],
    loads: {
      nodes: [{ node: "N2", fx: "0 N", fy: "-10 kN", mz: "0 N*m" }],
      elements: [{ element: "E1", kind: "uniform_local", qx: "0 N/m", qy: "-2 kN/m" }],
    },
  };
}

function dynamicsProject() {
  return {
    schema: adapter.DYNAMICS_SCHEMA,
    application: adapter.APPLICATION_ID,
    module: "dynamics",
    model: "independent-particle2d",
    simulation: { duration: "3 s", timeStep: "0.02 s" },
    objects: [
      {
        id: "D1",
        name: "<img src=x onerror=alert(1)>",
        kind: "circle",
        mass: 2,
        charge: 1,
        x: 1,
        y: 2,
        vx0: 3,
        vy0: 4,
        sizeA: 1,
        sizeB: 0.25,
        sizeC: 0.1,
        rigid: false,
      },
    ],
    fields: [{ id: "F1", kind: "gravity", magnitude: 9.81, angle: -90, rangeType: "global" }],
    forces: [{ id: "A1", targetId: "D1", type: "impulse", x: 4, y: 5 }],
  };
}

let checks = 0;
function check(run) {
  run();
  checks += 1;
}

check(() => {
  const legacy = staticProject();
  delete legacy.schema;
  delete legacy.application;
  delete legacy.module;
  const loaded = adapter.loadStaticProject(legacy);
  assert.equal(loaded.schema, adapter.STATIC_SCHEMA);
  assert.equal(loaded.application, adapter.APPLICATION_ID);
  assert.equal(loaded.module, "statics");
});

check(() => {
  const legacy = staticProject();
  delete legacy.schema;
  delete legacy.application;
  delete legacy.module;
  legacy.elements[0].type = "arc";
  delete legacy.elements[0].geometry;
  const loaded = adapter.loadStaticProject(legacy);
  assert.equal(loaded.elements[0].type, "frame");
  assert.equal(loaded.elements[0].geometry, "arc");
});

check(() => {
  const source = staticProject();
  const loaded = adapter.loadStaticProject(JSON.parse(JSON.stringify(source)));
  assert.deepEqual(loaded.metadata, source.metadata);
  assert.deepEqual(loaded.materials, source.materials);
  assert.deepEqual(loaded.sections, source.sections);
  assert.equal(loaded.nodes[0].support.angle, 37);
  assert.equal(loaded.elements[0].moment_release_j, true);
  assert.deepEqual(loaded.loads, source.loads);
});

check(() => {
  const legacy = dynamicsProject();
  delete legacy.schema;
  delete legacy.application;
  delete legacy.model;
  const loaded = adapter.loadDynamicsProject(legacy);
  assert.equal(loaded.schema, adapter.DYNAMICS_SCHEMA);
  assert.equal(loaded.application, adapter.APPLICATION_ID);
  assert.equal(loaded.model, "independent-particle2d");
});

check(() => {
  const legacy = dynamicsProject();
  legacy.schema = "mechanics-dynamics-project@1";
  delete legacy.application;
  const loaded = adapter.loadDynamicsProject(legacy);
  assert.equal(loaded.schema, adapter.DYNAMICS_SCHEMA);
  assert.equal(loaded.application, adapter.APPLICATION_ID);
});

check(() => {
  const source = dynamicsProject();
  const loaded = adapter.loadDynamicsProject(JSON.parse(JSON.stringify(source)));
  assert.deepEqual(loaded.objects, source.objects);
  assert.deepEqual(loaded.fields, source.fields);
  assert.deepEqual(loaded.forces, source.forces);
});

check(() => {
  assert.throws(() => adapter.loadStaticProject({ ...staticProject(), schema: "cms-static-project@99" }), /cms-static-project@99/);
});

check(() => {
  assert.throws(
    () => adapter.loadDynamicsProject({ ...dynamicsProject(), schema: "cms-dynamics-project@99" }),
    /cms-dynamics-project@99/
  );
});

check(() => {
  const project = staticProject();
  project.nodes.push({ ...project.nodes[0] });
  assert.throws(() => adapter.loadStaticProject(project), /节点 ID N1 重复/);
});

check(() => {
  const project = dynamicsProject();
  project.objects.push({ ...project.objects[0] });
  assert.throws(() => adapter.loadDynamicsProject(project), /动力学对象 ID D1 重复/);
});

check(() => {
  const project = staticProject();
  project.elements[0].node_j = "N9";
  assert.throws(() => adapter.loadStaticProject(project), /单元 E1.*节点 N9/);
});

check(() => {
  const project = staticProject();
  project.loads.nodes[0].node = "N9";
  assert.throws(() => adapter.loadStaticProject(project), /节点荷载.*节点 N9/);
});

check(() => {
  const project = dynamicsProject();
  project.forces[0].targetId = "D9";
  assert.throws(() => adapter.loadDynamicsProject(project), /外力 A1.*对象 D9/);
});

check(() => {
  const project = dynamicsProject();
  project.fields[0] = {
    id: "F1",
    kind: "electric",
    magnitude: 5,
    angle: 0,
    rangeType: "custom",
    path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
  };
  assert.throws(() => adapter.loadDynamicsProject(project), /F1.*至少需要 3 个点/);
});

check(() => {
  const project = dynamicsProject();
  project.fields[0] = {
    id: "F1",
    kind: "gravity",
    magnitude: 9.81,
    angle: -90,
    rangeType: "custom",
    path: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ],
  };
  assert.throws(() => adapter.loadDynamicsProject(project), /有效区域|非零面积/);
});

check(() => {
  const project = dynamicsProject();
  project.objects[0].mass = 0;
  assert.throws(() => adapter.loadDynamicsProject(project), /D1.*mass.*大于 0/);
});

check(() => {
  const project = dynamicsProject();
  project.simulation.timeStep = "0 s";
  assert.throws(() => adapter.loadDynamicsProject(project), /timeStep.*大于 0/);
});

check(() => {
  const project = staticProject();
  project.elements[0].moment_release_i = true;
  project.elements[0].moment_release_j = true;
  assert.throws(() => adapter.loadStaticProject(project), /E1 双端弯矩释放/);
});

check(() => {
  const project = staticProject();
  project.elements[0].type = "truss";
  project.loads.elements = [{ element: "E1", kind: "point_global", ratio: 0.5, fy: "-1 kN" }];
  assert.throws(() => adapter.loadStaticProject(project), /桁架单元 E1.*point_global/);
});

check(() => {
  const project = staticProject();
  project.loads.elements = [{ element: "E1", kind: "uniform_moment_local", mz: "1 kN*m/m" }];
  const loaded = adapter.loadStaticProject(project);
  assert.equal(loaded.loads.elements[0].kind, "uniform_moment_local");
  assert.equal(loaded.loads.elements[0].mz, "1 kN*m/m");
});

check(() => {
  const project = staticProject();
  project.elements[0].type = "truss";
  project.loads.elements = [{ element: "E1", kind: "uniform_moment_local", mz: "1 kN*m/m" }];
  assert.throws(() => adapter.loadStaticProject(project), /桁架单元 E1.*uniform_moment_local/);
});

check(() => {
  const project = staticProject();
  project.loads.elements = [{ element: "E1", kind: "uniform_moment_local", mz: "1 banana" }];
  assert.throws(() => adapter.loadStaticProject(project), /均布力偶的 mz/);
});

check(() => {
  const legacyStatic = staticProject();
  delete legacyStatic.schema;
  delete legacyStatic.application;
  delete legacyStatic.module;
  legacyStatic.elements[0].type = "tee";
  delete legacyStatic.elements[0].geometry;
  const staticBefore = JSON.stringify(legacyStatic);
  adapter.migrateStaticProject(legacyStatic);
  assert.equal(JSON.stringify(legacyStatic), staticBefore);

  const legacyDynamics = dynamicsProject();
  legacyDynamics.schema = "mechanics-dynamics-project@1";
  delete legacyDynamics.application;
  const dynamicsBefore = JSON.stringify(legacyDynamics);
  adapter.migrateDynamicsProject(legacyDynamics);
  assert.equal(JSON.stringify(legacyDynamics), dynamicsBefore);
});

check(() => {
  const project = staticProject();
  project.elements[0].type = "truss";
  project.elements[0].moment_release_i = true;
  project.elements[0].moment_release_j = true;
  const loaded = adapter.loadStaticProject(project);
  assert.equal(loaded.elements[0].moment_release_i, false);
  assert.equal(loaded.elements[0].moment_release_j, false);
});

check(() => {
  assert.throws(
    () => adapter.loadStaticProject({ ...staticProject(), application: "other-application" }),
    /application.*other-application/
  );
});

check(() => {
  const project = staticProject();
  project.nodes[1].x = "not-a-length";
  assert.throws(() => adapter.loadStaticProject(project), /节点 N2 的 x 无法解析/);
});

check(() => {
  assert.equal(adapter.DYNAMICS_SCHEMA, "cms-dynamics-project@2");
  const legacy = dynamicsProject();
  legacy.schema = "cms-dynamics-project@1";
  legacy.objects[0].theta0 = 0.25;
  legacy.objects[0].omega0 = -2;
  legacy.forces[0].localPoint = { x: 0.3, y: -0.2 };
  const loaded = adapter.loadDynamicsProject(legacy);
  assert.equal(loaded.schema, adapter.DYNAMICS_SCHEMA);
  assert.equal(loaded.objects[0].initialState.theta, 0.25);
  assert.equal(loaded.objects[0].initialState.omega, -2);
  assert.deepEqual(loaded.forces[0].applicationPoint, { frame: "local", x: 0.3, y: -0.2 });
  assert.deepEqual(loaded.tracks, []);
  assert.deepEqual(loaded.grounds, []);
});

check(() => {
  const project = dynamicsProject();
  project.model = "coupled-rigid-body2d";
  project.simulation.maxSubsteps = 32;
  project.simulation.contactIterations = 12;
  project.objects[0] = {
    id: "D1",
    name: "rolling disk",
    geometry: { kind: "circle", sizeA: 1, sizeB: 0.5, sizeC: 0.1, collisionRadius: 0.5 },
    massProperties: { mass: 2, density: 1, charge: 0, inertia: 0.25, centerOfMass: { x: 0, y: 0 } },
    initialState: { x: 0, y: 1, vx: 1, vy: 0, theta: 0.2, omega: -2 },
    contact: { enabled: true, restitution: 0.4, staticFriction: 0.6, dynamicFriction: 0.4, damping: 0.1 },
  };
  project.fields[0] = {
    id: "F1",
    kind: "gravity",
    rangeType: "global",
    variation: { mode: "time-space", unit: "m/s^2", components: { x: "0", y: "-9.81*(1+0.01*t)" } },
  };
  project.forces[0].applicationPoint = { frame: "local", x: 0.5, y: 0 };
  project.grounds = [
    {
      id: "G1",
      normal: { x: 0, y: 1 },
      offset: 0,
      contact: { restitution: 0.2, staticFriction: 0.7, dynamicFriction: 0.5, damping: 0 },
    },
  ];
  project.tracks = [
    {
      id: "T1",
      kind: "arc",
      geometry: { center: { x: 0, y: 0 }, radius: 2, startAngle: 0, endAngle: 1.57 },
      endpointBehavior: "release",
      rolling: true,
    },
  ];
  project.constraints = [{ id: "C1", bodyId: "D1", trackId: "T1", rolling: true }];
  const loaded = adapter.loadDynamicsProject(project);
  assert.deepEqual(loaded.forces[0].applicationPoint, { frame: "local", x: 0.5, y: 0 });
  assert.equal(loaded.tracks[0].kind, "arc");
  assert.equal(loaded.constraints[0].rolling, true);
});

check(() => {
  const project = dynamicsProject();
  project.model = "coupled-rigid-body2d";
  project.objects[0].kind = "rectangle";
  project.objects[0].contact = { enabled: true, restitution: 0.5 };
  assert.throws(() => adapter.loadDynamicsProject(project), /几何 rectangle.*尚未实现碰撞/);
});

check(() => {
  const project = dynamicsProject();
  project.objects[0].contact = {
    enabled: true,
    restitution: 1.1,
    staticFriction: 0.2,
    dynamicFriction: 0.3,
  };
  assert.throws(() => adapter.loadDynamicsProject(project), /restitution.*\[0, 1\]|staticFriction/);
});

check(() => {
  const project = dynamicsProject();
  project.forces[0].applicationPoint = { frame: "screen", x: 1, y: 2 };
  assert.throws(() => adapter.loadDynamicsProject(project), /applicationPoint.*local 或 world/);
});

check(() => {
  const project = dynamicsProject();
  project.tracks = [
    { id: "T1", kind: "line", bodyId: "missing", start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  ];
  assert.throws(() => adapter.loadDynamicsProject(project), /轨道 T1.*不存在的对象 missing/);
});

console.log(`project-schema: ${checks} checks passed`);
