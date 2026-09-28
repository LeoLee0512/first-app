"""Pre-solve validation for mechanics projects."""

from __future__ import annotations

import math
from collections import Counter, defaultdict

from .models import DOFS, Project


class ValidationError(ValueError):
    """Raised when a project is not valid for solving."""


SUPPORTED_ELEMENT_TYPES = {"frame", "rigid", "truss"}
SUPPORTED_ELEMENT_LOADS = {
    "uniform_local",
    "linear_local",
    "polynomial_local",
    "point_global",
    "uniform_moment_local",
}


def validate_project(project: Project) -> None:
    _ensure_unique("node", [node.id for node in project.nodes])
    _ensure_unique("material", [material.id for material in project.materials])
    _ensure_unique("section", [section.id for section in project.sections])
    _ensure_unique("element", [element.id for element in project.elements])

    nodes = {node.id: node for node in project.nodes}
    materials = {material.id for material in project.materials}
    sections = {section.id for section in project.sections}
    elements = {element.id: element for element in project.elements}
    connected: dict[str, int] = defaultdict(int)

    if not project.nodes:
        raise ValidationError("Project must contain at least one node.")
    if not project.elements:
        raise ValidationError("Project must contain at least one element.")

    for element in project.elements:
        if element.node_i not in nodes:
            raise ValidationError(f"Element {element.id} references missing node {element.node_i}.")
        if element.node_j not in nodes:
            raise ValidationError(f"Element {element.id} references missing node {element.node_j}.")
        if element.node_i == element.node_j:
            raise ValidationError(f"Element {element.id} has identical end nodes.")
        if element.material not in materials:
            raise ValidationError(f"Element {element.id} references missing material {element.material}.")
        if element.section not in sections:
            raise ValidationError(f"Element {element.id} references missing section {element.section}.")
        if element.type not in SUPPORTED_ELEMENT_TYPES:
            raise ValidationError(
                f"Unsupported element type: {element.type!r}. The solver only handles straight "
                "'frame', 'rigid' and 'truss' elements; curved or bent members (arc, tee, right_angle, "
                "freeform) must be discretised into straight segments before solving."
            )
        if element.moment_release_i and element.moment_release_j:
            raise ValidationError(
                f"Element {element.id} has moment releases at both ends. "
                "Double-end releases are not supported yet."
            )
        if element.type != "frame" and (element.moment_release_i or element.moment_release_j):
            raise ValidationError(f"Element {element.id} is not a frame and cannot carry moment-release flags.")
        connected[element.node_i] += 1
        connected[element.node_j] += 1

    for node in project.nodes:
        if not math.isfinite(node.support_angle):
            raise ValidationError(f"Node {node.id} has a non-finite support_angle.")

    isolated = [node.id for node in project.nodes if connected[node.id] == 0]
    if isolated:
        raise ValidationError(f"Isolated nodes are not allowed: {', '.join(isolated)}.")

    restrained_count = sum(sum(node.restraints) for node in project.nodes)
    if restrained_count < len(DOFS):
        raise ValidationError("At least three restrained DOFs are required for a stable 2D model.")

    for load in project.nodal_loads:
        if load.node not in nodes:
            raise ValidationError(f"Nodal load references missing node {load.node}.")

    for load in project.element_loads:
        if load.element not in elements:
            raise ValidationError(f"Element load references missing element {load.element}.")
        if load.kind not in SUPPORTED_ELEMENT_LOADS:
            raise ValidationError(f"Unsupported element load kind: {load.kind!r}.")
        element = elements[load.element]
        if element.type == "truss":
            at_end_node = load.kind == "point_global" and load.ratio is not None and (
                math.isclose(load.ratio, 0.0, abs_tol=1e-12) or math.isclose(load.ratio, 1.0, abs_tol=1e-12)
            )
            if not at_end_node or not math.isclose(load.mz, 0.0, abs_tol=1e-12):
                raise ValidationError("桁架杆只能在节点处承受外荷载；请在荷载位置插入节点并拆分杆件。")
        if load.kind == "point_global":
            if load.ratio is None or not math.isfinite(load.ratio) or not 0.0 <= load.ratio <= 1.0:
                raise ValidationError(f"Point load on element {load.element} must have a ratio between 0 and 1.")


def _ensure_unique(label: str, ids: list[str]) -> None:
    duplicated = sorted(item for item, count in Counter(ids).items() if count > 1)
    if duplicated:
        raise ValidationError(f"Duplicate {label} id(s): {', '.join(duplicated)}.")
