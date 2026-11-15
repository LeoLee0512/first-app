"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const DistributedLoad = require("../web/distributed-load.js");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "web", "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "web", "app.js"), "utf8");

const horizontal = {
  elementId: "E1",
  direction: "down",
  angle: -90,
  nodeI: { x: 0, y: 0 },
  nodeJ: { x: 4, y: 0 },
};

function component(text) {
  return Number(String(text).split(" ")[0]);
}

test("default triangular 5 and 5 is not a 0-to-5 load", () => {
  const load = DistributedLoad.memberDistributedLoad({
    ...horizontal,
    shape: "triangular",
    qi: "5 kN/m",
    qj: "5 kN/m",
  });
  assert.equal(load.kind, "uniform_local");
  assert.ok(Math.abs(component(load.qy) + 5000) < 1e-4);
  assert.ok(Math.abs(component(load.qx)) < 1e-4);
  assert.equal(load.qy_i, undefined);
  assert.equal(load.qy_j, undefined);
});

test("triangular load keeps both typed ends", () => {
  const load = DistributedLoad.memberDistributedLoad({
    ...horizontal,
    shape: "triangular",
    qi: "8 kN/m",
    qj: "2 kN/m",
  });
  assert.equal(load.kind, "linear_local");
  assert.ok(Math.abs(component(load.qy_i) + 8000) < 1e-4);
  assert.ok(Math.abs(component(load.qy_j) + 2000) < 1e-4);
});

test("rectangular load does not drop the other end", () => {
  const uneven = DistributedLoad.memberDistributedLoad({
    ...horizontal,
    shape: "rectangular",
    qi: "8 kN/m",
    qj: "2 kN/m",
  });
  assert.equal(uneven.kind, "linear_local");
  assert.ok(Math.abs(component(uneven.qy_i) + 8000) < 1e-4);
  assert.ok(Math.abs(component(uneven.qy_j) + 2000) < 1e-4);

  const even = DistributedLoad.memberDistributedLoad({
    ...horizontal,
    shape: "rectangular",
    qi: "5 kN/m",
    qj: "5 kN/m",
  });
  assert.equal(even.kind, "uniform_local");
  assert.ok(Math.abs(component(even.qy) + 5000) < 1e-4);
});

test("the form, the drawing, and the note describe the path-length load", () => {
  assert.match(html, /id="distributedQi" value="5 kN\/m"/);
  assert.match(html, /id="distributedQj" value="5 kN\/m"/);
  assert.match(html, /沿该路径全长按线密度施加/);
  assert.match(html, /T 形不拆分/);
  assert.doesNotMatch(html, /求解时按两端节点间的二维直梁柱单元处理/);
  const scriptAt = html.indexOf("/static/distributed-load.js");
  assert.ok(scriptAt > html.indexOf("/static/units.js"));
  assert.ok(scriptAt < html.indexOf("/static/app.js"));

  const maker = app.slice(app.indexOf("function makeDistributedLoad"), app.indexOf("function splitCoefficients"));
  assert.match(maker, /memberDistributedLoad/);
  assert.doesNotMatch(maker, /shape === "triangular" \? 0/);

  const drawing = app.slice(app.indexOf("function drawElementLoads"), app.indexOf("function distributedLoadLabel"));
  assert.match(drawing, /elementPath/);
  assert.match(drawing, /globalDistributedIntensity/);
  assert.match(drawing, /pointAtPathRatio/);
});
