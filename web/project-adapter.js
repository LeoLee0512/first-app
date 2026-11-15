"use strict";

(function exposeProjectAdapter(root, factory) {
  const projectSchema = typeof module === "object" && module.exports ? require("./project-schema.js") : root.ProjectSchema;
  const api = factory(projectSchema);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ProjectAdapter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createProjectAdapter(ProjectSchema) {
  if (!ProjectSchema) throw new Error("ProjectAdapter requires ProjectSchema.");
  const SOLVER_ELEMENT_TYPES = new Set(["frame", "rigid", "truss"]);

  function solverElementType(element) {
    const type = String(element?.type || "frame");
    return SOLVER_ELEMENT_TYPES.has(type) ? type : "frame";
  }

  function solverElement(element) {
    const type = solverElementType(element);
    const momentReleaseI = type === "frame" && Boolean(element?.moment_release_i);
    const momentReleaseJ = type === "frame" && Boolean(element?.moment_release_j);
    if (momentReleaseI && momentReleaseJ) {
      throw new Error("当前版本不支持普通梁柱双端弯矩释放，请拆分杆件或改用桁架单元。");
    }
    return {
      type,
      moment_release_i: momentReleaseI,
      moment_release_j: momentReleaseJ,
    };
  }

  /**
   * Materials and sections used by a solve or a saved file.
   * The toolbar edits the first entry. Every later entry, and the material
   * or section id stored on each member, is kept.
   */
  function solveCatalog(input) {
    const materials = JSON.parse(JSON.stringify(input.materials || []));
    const sections = JSON.parse(JSON.stringify(input.sections || []));
    const toolbar = input.toolbar || {};
    const elastic = toolbar.E ?? "200 GPa";
    const area = toolbar.A ?? "10000 mm^2";
    const inertia = toolbar.I ?? "80000000 mm^4";
    if (!materials.length) materials.push({ id: "steel", E: elastic, nu: 0.3 });
    if (!sections.length) sections.push({ id: "default", A: area, I: inertia });
    materials[0] = { ...materials[0], E: elastic };
    sections[0] = { ...sections[0], A: area, I: inertia };
    const elements = (input.elements || []).map((element) => ({
      material: element.material || materials[0].id,
      section: element.section || sections[0].id,
    }));
    return { materials, sections, elements };
  }

  return { ...ProjectSchema, solverElementType, solverElement, solveCatalog };
});
