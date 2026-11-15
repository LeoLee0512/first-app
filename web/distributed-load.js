"use strict";

/**
 * Distributed-load form → element load.
 *
 * Both end magnitudes are kept. A triangular load is not forced to start at
 * zero, and a rectangular load does not drop the far end: equal ends are a
 * uniform load, unequal ends are linear from qi to qj. The numbers are
 * magnitudes; the sign comes from the direction control.
 */
(function exposeDistributedLoad(root, factory) {
  const units = typeof module === "object" && module.exports ? require("./units.js") : root.Units;
  const api = factory(units);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.DistributedLoad = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDistributedLoad(Units) {
  if (!Units) throw new Error("DistributedLoad requires Units.");

  const SAME_END_TOLERANCE = 1e-6;

  function formatLoad(value) {
    const rounded = Math.abs(value) < 1e-9 ? 0 : Number(value.toFixed(6));
    return `${rounded} N/m`;
  }

  function magnitude(text) {
    return Math.abs(Units.parseQuantity(text, "N/m"));
  }

  function globalVector(value, direction, angleValue) {
    const angleMap = { right: 0, up: 90, left: 180, down: -90 };
    const angle = (direction === "angle" ? Number(angleValue || 0) : angleMap[direction]) * (Math.PI / 180);
    return { x: value * Math.cos(angle), y: value * Math.sin(angle) };
  }

  function localComponents(nodeI, nodeJ, value, direction, angleValue) {
    const dx = nodeJ.x - nodeI.x;
    const dy = nodeJ.y - nodeI.y;
    const length = Math.hypot(dx, dy) || 1;
    const c = dx / length;
    const s = dy / length;
    const global = globalVector(value, direction, angleValue);
    return {
      qx: c * global.x + s * global.y,
      qy: -s * global.x + c * global.y,
    };
  }

  function memberDistributedLoad(input) {
    const nodeI = input.nodeI;
    const nodeJ = input.nodeJ;
    const qiMagnitude = magnitude(input.qi);
    const qjMagnitude = magnitude(input.qj);
    const qi = localComponents(nodeI, nodeJ, qiMagnitude, input.direction, input.angle);
    const qj = localComponents(nodeI, nodeJ, qjMagnitude, input.direction, input.angle);
    const sameEnds = Math.abs(qiMagnitude - qjMagnitude) <= SAME_END_TOLERANCE;
    if (sameEnds) {
      return {
        element: input.elementId,
        kind: "uniform_local",
        qx: formatLoad(qi.qx),
        qy: formatLoad(qi.qy),
      };
    }
    return {
      element: input.elementId,
      kind: "linear_local",
      qx_i: formatLoad(qi.qx),
      qy_i: formatLoad(qi.qy),
      qx_j: formatLoad(qj.qx),
      qy_j: formatLoad(qj.qy),
    };
  }

  return { memberDistributedLoad };
});
