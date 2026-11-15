"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const adapter = require("../web/project-adapter.js");

test("solve catalog keeps every stored material and section", () => {
  const stored = {
    materials: [
      { id: "steel", E: "200 GPa", nu: 0.3 },
      { id: "aluminum", E: "70 GPa", nu: 0.33 },
    ],
    sections: [
      { id: "default", A: "10000 mm^2", I: "80000000 mm^4" },
      { id: "light", A: "2000 mm^2", I: "4000000 mm^4" },
    ],
  };
  const catalog = adapter.solveCatalog({
    ...stored,
    toolbar: { E: "210 GPa", A: "12000 mm^2", I: "90000000 mm^4" },
    elements: [
      { id: "E1", material: "steel", section: "default" },
      { id: "E2", material: "aluminum", section: "light" },
    ],
  });

  assert.equal(catalog.materials[0].E, "210 GPa");
  assert.equal(catalog.materials[0].nu, 0.3);
  assert.equal(catalog.materials[1].E, "70 GPa");
  assert.equal(catalog.sections[0].A, "12000 mm^2");
  assert.equal(catalog.sections[1].id, "light");
  assert.equal(catalog.sections[1].I, "4000000 mm^4");
  assert.deepEqual(catalog.elements, [
    { material: "steel", section: "default" },
    { material: "aluminum", section: "light" },
  ]);
  assert.equal(stored.materials[0].E, "200 GPa");
});

test("buildProject uses the stored catalog instead of one steel section", () => {
  const app = fs.readFileSync(path.join(__dirname, "..", "web", "app.js"), "utf8");
  const buildProject = app.slice(app.indexOf("function buildProject"), app.indexOf("function discretisationLines"));
  assert.match(buildProject, /memberCatalog\(expanded\.elements\)/);
  assert.doesNotMatch(buildProject, /material:\s*"steel"/);
  assert.doesNotMatch(buildProject, /section:\s*"default"/);
  const editable = app.slice(app.indexOf("function buildEditableProject"), app.indexOf("function selectedElement"));
  assert.match(editable, /memberCatalog\(state\.elements\)/);
});
