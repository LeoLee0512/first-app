"""2D frame finite element solver."""

from __future__ import annotations

import math

import numpy as np

from .models import DOFS, AnalysisResult, Element, ElementLoad, Project
from .preprocess import validate_project

REACTION_LABELS = {"ux": "fx", "uy": "fy", "rz": "mz"}
RIGID_STIFFNESS_FACTOR = 1_000_000.0


class SolverError(RuntimeError):
    """Raised when the solver cannot produce a result."""


class Frame2DSolver:
    """Matrix stiffness solver for 2D frame elements.

    Element DOF order is `[ux_i, uy_i, rz_i, ux_j, uy_j, rz_j]`.
    """

    def solve(self, project: Project) -> AnalysisResult:
        validate_project(project)

        nodes = {node.id: node for node in project.nodes}
        dof_index = {
            (node.id, dof): node_pos * len(DOFS) + dof_pos
            for node_pos, node in enumerate(project.nodes)
            for dof_pos, dof in enumerate(DOFS)
        }
        total_dofs = len(project.nodes) * len(DOFS)
        stiffness = np.zeros((total_dofs, total_dofs), dtype=float)
        loads = np.zeros(total_dofs, dtype=float)
        element_fixed_loads: dict[str, np.ndarray] = {}
        load_integrals: dict[str, dict[str, object]] = {}

        for element in project.elements:
            indexes = _element_indexes(element, dof_index)
            local_k, transform, _ = _element_matrices(project, element)
            global_k = transform.T @ local_k @ transform
            _assemble_matrix(stiffness, global_k, indexes)

        for nodal_load in project.nodal_loads:
            loads[dof_index[(nodal_load.node, "ux")]] += nodal_load.fx
            loads[dof_index[(nodal_load.node, "uy")]] += nodal_load.fy
            loads[dof_index[(nodal_load.node, "rz")]] += nodal_load.mz

        for element_load in project.element_loads:
            element = _element_by_id(project, element_load.element)
            indexes = _element_indexes(element, dof_index)
            _, transform, length = _element_matrices(project, element)
            if _assemble_endpoint_point_load(element_load, element, dof_index, loads):
                continue
            local_load = _consistent_element_load(element_load, length, transform)
            local_load = _apply_moment_releases_to_load(project, element, local_load)
            loads[indexes] += transform.T @ local_load
            existing = element_fixed_loads.get(element.id, np.zeros(6, dtype=float))
            element_fixed_loads[element.id] = existing + local_load
            load_integrals[element.id] = _merge_load_integrals(
                load_integrals.get(element.id),
                _load_integrals(element_load, length, transform),
            )

        restrained: list[int] = []
        for node in project.nodes:
            for dof_pos, is_restrained in enumerate(node.restraints):
                if is_restrained:
                    restrained.append(dof_index[(node.id, DOFS[dof_pos])])

        all_dofs = np.arange(total_dofs)
        free = np.array([index for index in all_dofs if index not in restrained], dtype=int)
        free = _active_free_dofs(stiffness, loads, free)
        restrained_array = np.array(restrained, dtype=int)

        if free.size == 0:
            raise SolverError("Model has no free degrees of freedom.")

        k_ff = stiffness[np.ix_(free, free)]
        p_f = loads[free]
        displacements = np.zeros(total_dofs, dtype=float)
        try:
            displacements[free] = np.linalg.solve(k_ff, p_f)
        except np.linalg.LinAlgError as exc:
            raise SolverError(
                "Stiffness matrix is singular. Check restraints, disconnected geometry, or mechanisms."
            ) from exc

        reactions_vector = stiffness @ displacements - loads

        displacement_map = _map_node_vectors(project, displacements, dof_index)
        reaction_map = _map_reactions(project, reactions_vector, dof_index, restrained_array)
        element_end_forces = _map_element_forces(
            project,
            displacements,
            dof_index,
            element_fixed_loads,
        )
        element_diagrams = _map_element_diagrams(project, element_end_forces, load_integrals)
        summary = _build_summary(project, displacement_map, reaction_map, element_end_forces, element_diagrams)

        return AnalysisResult(
            displacements=displacement_map,
            reactions=reaction_map,
            element_end_forces=element_end_forces,
            element_diagrams=element_diagrams,
            summary=summary,
        )


def _element_matrices(
    project: Project,
    element: Element,
    apply_releases: bool = True,
) -> tuple[np.ndarray, np.ndarray, float]:
    nodes = {node.id: node for node in project.nodes}
    materials = {material.id: material for material in project.materials}
    sections = {section.id: section for section in project.sections}
    node_i = nodes[element.node_i]
    node_j = nodes[element.node_j]
    dx = node_j.x - node_i.x
    dy = node_j.y - node_i.y
    length = math.hypot(dx, dy)
    if length <= 0:
        raise SolverError(f"Element {element.id} has zero length.")

    material = materials[element.material]
    section = sections[element.section]
    ea = material.elastic_modulus * section.area
    ei = material.elastic_modulus * section.inertia
    if element.type == "rigid":
        ea *= RIGID_STIFFNESS_FACTOR
        ei *= RIGID_STIFFNESS_FACTOR
    if element.type == "truss":
        local_k = _local_truss_stiffness(ea, length)
    else:
        local_k = _local_frame_stiffness(ea, ei, length)
        if apply_releases:
            local_k = _apply_moment_releases_to_stiffness(local_k, element)
    transform = _transformation(dx / length, dy / length)
    return local_k, transform, length


def _active_free_dofs(stiffness: np.ndarray, loads: np.ndarray, free: np.ndarray) -> np.ndarray:
    active: list[int] = []
    stiffness_scale = max(float(np.max(np.abs(stiffness))), 1.0)
    load_scale = max(float(np.max(np.abs(loads))), 1.0)
    stiffness_tolerance = stiffness_scale * 1e-12
    load_tolerance = load_scale * 1e-12
    for index in free:
        if np.max(np.abs(stiffness[int(index), :])) <= stiffness_tolerance and abs(loads[int(index)]) <= load_tolerance:
            continue
        active.append(int(index))
    return np.array(active, dtype=int)


def _moment_release_indexes(element: Element) -> list[int]:
    indexes: list[int] = []
    if element.moment_release_i:
        indexes.append(2)
    if element.moment_release_j:
        indexes.append(5)
    return indexes


def _apply_moment_releases_to_stiffness(local_k: np.ndarray, element: Element) -> np.ndarray:
    released = _moment_release_indexes(element)
    if not released:
        return local_k
    kept = [index for index in range(6) if index not in released]
    k_aa = local_k[np.ix_(kept, kept)]
    k_ar = local_k[np.ix_(kept, released)]
    k_ra = local_k[np.ix_(released, kept)]
    k_rr = local_k[np.ix_(released, released)]
    condensed = k_aa - k_ar @ np.linalg.solve(k_rr, k_ra)
    result = np.zeros_like(local_k)
    result[np.ix_(kept, kept)] = condensed
    return result


def _apply_moment_releases_to_load(project: Project, element: Element, local_load: np.ndarray) -> np.ndarray:
    released = _moment_release_indexes(element)
    if not released or element.type == "truss":
        return local_load
    base_k, _, _ = _element_matrices(project, element, apply_releases=False)
    kept = [index for index in range(6) if index not in released]
    k_ar = base_k[np.ix_(kept, released)]
    k_rr = base_k[np.ix_(released, released)]
    condensed = local_load[kept] - k_ar @ np.linalg.solve(k_rr, local_load[released])
    result = np.zeros_like(local_load)
    result[kept] = condensed
    return result


def _local_truss_stiffness(ea: float, length: float) -> np.ndarray:
    axial = ea / length
    return np.array(
        [
            [axial, 0.0, 0.0, -axial, 0.0, 0.0],
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            [-axial, 0.0, 0.0, axial, 0.0, 0.0],
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        ],
        dtype=float,
    )


def _local_frame_stiffness(ea: float, ei: float, length: float) -> np.ndarray:
    axial = ea / length
    flex_12 = 12.0 * ei / length**3
    flex_6 = 6.0 * ei / length**2
    flex_4 = 4.0 * ei / length
    flex_2 = 2.0 * ei / length
    return np.array(
        [
            [axial, 0.0, 0.0, -axial, 0.0, 0.0],
            [0.0, flex_12, flex_6, 0.0, -flex_12, flex_6],
            [0.0, flex_6, flex_4, 0.0, -flex_6, flex_2],
            [-axial, 0.0, 0.0, axial, 0.0, 0.0],
            [0.0, -flex_12, -flex_6, 0.0, flex_12, -flex_6],
            [0.0, flex_6, flex_2, 0.0, -flex_6, flex_4],
        ],
        dtype=float,
    )


def _transformation(cosine: float, sine: float) -> np.ndarray:
    return np.array(
        [
            [cosine, sine, 0.0, 0.0, 0.0, 0.0],
            [-sine, cosine, 0.0, 0.0, 0.0, 0.0],
            [0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
            [0.0, 0.0, 0.0, cosine, sine, 0.0],
            [0.0, 0.0, 0.0, -sine, cosine, 0.0],
            [0.0, 0.0, 0.0, 0.0, 0.0, 1.0],
        ],
        dtype=float,
    )


def _consistent_element_load(load: ElementLoad, length: float, transform: np.ndarray) -> np.ndarray:
    """Equivalent local nodal load by Gauss integration.

    `r` is the normalized coordinate x / L. Axial loads use linear shape
    functions; transverse loads use Euler-Bernoulli Hermite functions.
    """

    if load.kind == "point_global":
        return _consistent_point_load(load, length, transform)

    if load.kind == "uniform_moment_local":
        # A uniform couple m (N*m/m, counter-clockwise positive) works against
        # the slope v'(x) = Σ H_i'(x) d_i, so the consistent load is
        # ∫ m H_i'(x) dx = m [H_i(L) - H_i(0)]: only the two translational
        # Hermite functions change value over the element.
        return np.array([0.0, -load.mz, 0.0, 0.0, load.mz, 0.0], dtype=float)

    result = np.zeros(6, dtype=float)
    points, weights = np.polynomial.legendre.leggauss(8)
    for point, weight in zip(points, weights):
        r = 0.5 * (float(point) + 1.0)
        integration_weight = 0.5 * float(weight) * length
        qx = _evaluate_axis_load(load, "x", r)
        qy = _evaluate_axis_load(load, "y", r)
        n1 = 1.0 - r
        n2 = r
        h1 = 1.0 - 3.0 * r**2 + 2.0 * r**3
        h2 = length * (r - 2.0 * r**2 + r**3)
        h3 = 3.0 * r**2 - 2.0 * r**3
        h4 = length * (-r**2 + r**3)
        result += integration_weight * np.array(
            [n1 * qx, h1 * qy, h2 * qy, n2 * qx, h3 * qy, h4 * qy],
            dtype=float,
        )
    return result


def _consistent_point_load(load: ElementLoad, length: float, transform: np.ndarray) -> np.ndarray:
    if load.ratio is None:
        raise SolverError(f"Point load on element {load.element} has no position ratio.")
    r = float(load.ratio)
    local_fx, local_fy = _point_load_local_components(load, transform)
    n1 = 1.0 - r
    n2 = r
    h1 = 1.0 - 3.0 * r**2 + 2.0 * r**3
    h2 = length * (r - 2.0 * r**2 + r**3)
    h3 = 3.0 * r**2 - 2.0 * r**3
    h4 = length * (-r**2 + r**3)
    dh1 = (-6.0 * r + 6.0 * r**2) / length
    dh2 = 1.0 - 4.0 * r + 3.0 * r**2
    dh3 = (6.0 * r - 6.0 * r**2) / length
    dh4 = -2.0 * r + 3.0 * r**2
    force_vector = np.array(
        [n1 * local_fx, h1 * local_fy, h2 * local_fy, n2 * local_fx, h3 * local_fy, h4 * local_fy],
        dtype=float,
    )
    moment_vector = load.mz * np.array([0.0, dh1, dh2, 0.0, dh3, dh4], dtype=float)
    return force_vector + moment_vector


def _point_load_local_components(load: ElementLoad, transform: np.ndarray) -> tuple[float, float]:
    local = transform[:2, :2] @ np.array([load.fx, load.fy], dtype=float)
    return float(local[0]), float(local[1])


def _assemble_endpoint_point_load(
    load: ElementLoad,
    element: Element,
    dof_index: dict[tuple[str, str], int],
    loads: np.ndarray,
) -> bool:
    if load.kind != "point_global" or load.ratio is None:
        return False
    if not (math.isclose(load.ratio, 0.0, abs_tol=1e-12) or math.isclose(load.ratio, 1.0, abs_tol=1e-12)):
        return False
    node_id = element.node_i if math.isclose(load.ratio, 0.0, abs_tol=1e-12) else element.node_j
    loads[dof_index[(node_id, "ux")]] += load.fx
    loads[dof_index[(node_id, "uy")]] += load.fy
    loads[dof_index[(node_id, "rz")]] += load.mz
    return True


def _evaluate_axis_load(load: ElementLoad, axis: str, r: float) -> float:
    if load.kind == "uniform_local":
        return load.qx if axis == "x" else load.qy

    if load.kind == "linear_local":
        start = _axis_attr(load, axis, "i")
        end = _axis_attr(load, axis, "j")
        if start is None:
            start = load.qx if axis == "x" else load.qy
        if end is None:
            end = start
        return start + (end - start) * r

    if load.kind == "polynomial_local":
        coefficients = load.qx_coefficients if axis == "x" else load.qy_coefficients
        return sum(coefficient * r**power for power, coefficient in enumerate(coefficients))

    raise SolverError(f"Unsupported element load kind: {load.kind!r}")


def _axis_attr(load: ElementLoad, axis: str, end: str) -> float | None:
    if axis == "x" and end == "i":
        return load.qx_i
    if axis == "x" and end == "j":
        return load.qx_j
    if axis == "y" and end == "i":
        return load.qy_i
    return load.qy_j


def _load_integrals(load: ElementLoad, length: float, transform: np.ndarray) -> dict[str, object]:
    samples = np.linspace(0.0, length, 41)
    if load.kind == "uniform_moment_local":
        # The couple has no force resultant; moment equilibrium of the segment
        # [0, x] gives a linear contribution -m·x to the bending moment.
        zeros = np.zeros_like(samples, dtype=float)
        return {
            "x": samples,
            "qx": zeros.copy(),
            "qy": zeros.copy(),
            "axial": zeros.copy(),
            "shear": zeros.copy(),
            "moment": -float(load.mz) * samples,
            "point_events": [],
        }
    if load.kind == "point_global":
        if load.ratio is None:
            raise SolverError(f"Point load on element {load.element} has no position ratio.")
        local_fx, local_fy = _point_load_local_components(load, transform)
        zeros = np.zeros_like(samples, dtype=float)
        return {
            "x": samples,
            "qx": zeros.copy(),
            "qy": zeros.copy(),
            "axial": zeros.copy(),
            "shear": zeros.copy(),
            "moment": zeros.copy(),
            "point_events": [
                {
                    "x": float(load.ratio) * length,
                    "fx": local_fx,
                    "fy": local_fy,
                    "mz": float(load.mz),
                }
            ],
        }
    qx_values = np.array([_evaluate_axis_load(load, "x", x / length) for x in samples], dtype=float)
    qy_values = np.array([_evaluate_axis_load(load, "y", x / length) for x in samples], dtype=float)
    shear_integral = _cumulative_trapezoid(samples, qy_values)
    axial_integral = _cumulative_trapezoid(samples, qx_values)
    moment_integral = _cumulative_trapezoid(samples, shear_integral)
    return {
        "x": samples,
        "qx": qx_values,
        "qy": qy_values,
        "axial": axial_integral,
        "shear": shear_integral,
        "moment": moment_integral,
        "point_events": [],
    }


def _cumulative_trapezoid(x_values: np.ndarray, y_values: np.ndarray) -> np.ndarray:
    result = np.zeros_like(x_values, dtype=float)
    for index in range(1, len(x_values)):
        dx = x_values[index] - x_values[index - 1]
        result[index] = result[index - 1] + 0.5 * dx * (y_values[index] + y_values[index - 1])
    return result


def _merge_load_integrals(
    existing: dict[str, object] | None,
    current: dict[str, object],
) -> dict[str, object]:
    if existing is None:
        return current
    return {
        "x": current["x"],
        "qx": np.asarray(existing["qx"]) + np.asarray(current["qx"]),
        "qy": np.asarray(existing["qy"]) + np.asarray(current["qy"]),
        "axial": np.asarray(existing["axial"]) + np.asarray(current["axial"]),
        "shear": np.asarray(existing["shear"]) + np.asarray(current["shear"]),
        "moment": np.asarray(existing["moment"]) + np.asarray(current["moment"]),
        "point_events": [*list(existing.get("point_events", [])), *list(current.get("point_events", []))],
    }


def _assemble_matrix(target: np.ndarray, element_matrix: np.ndarray, indexes: list[int]) -> None:
    for row_pos, row_index in enumerate(indexes):
        for col_pos, col_index in enumerate(indexes):
            target[row_index, col_index] += element_matrix[row_pos, col_pos]


def _element_indexes(element: Element, dof_index: dict[tuple[str, str], int]) -> list[int]:
    return [
        dof_index[(element.node_i, "ux")],
        dof_index[(element.node_i, "uy")],
        dof_index[(element.node_i, "rz")],
        dof_index[(element.node_j, "ux")],
        dof_index[(element.node_j, "uy")],
        dof_index[(element.node_j, "rz")],
    ]


def _element_by_id(project: Project, element_id: str) -> Element:
    for element in project.elements:
        if element.id == element_id:
            return element
    raise SolverError(f"Element not found: {element_id}")


def _map_node_vectors(
    project: Project,
    vector: np.ndarray,
    dof_index: dict[tuple[str, str], int],
) -> dict[str, dict[str, float]]:
    return {
        node.id: {dof: float(vector[dof_index[(node.id, dof)]]) for dof in DOFS}
        for node in project.nodes
    }


def _map_reactions(
    project: Project,
    reactions: np.ndarray,
    dof_index: dict[tuple[str, str], int],
    restrained: np.ndarray,
) -> dict[str, dict[str, float]]:
    restrained_set = set(int(item) for item in restrained)
    result: dict[str, dict[str, float]] = {}
    for node in project.nodes:
        node_reactions: dict[str, float] = {}
        for dof in DOFS:
            index = dof_index[(node.id, dof)]
            if index in restrained_set:
                node_reactions[REACTION_LABELS[dof]] = float(reactions[index])
        if node_reactions:
            result[node.id] = node_reactions
    return result


def _map_element_forces(
    project: Project,
    displacements: np.ndarray,
    dof_index: dict[tuple[str, str], int],
    element_fixed_loads: dict[str, np.ndarray],
) -> dict[str, dict[str, float]]:
    labels = ("n_i", "v_i", "m_i", "n_j", "v_j", "m_j")
    result: dict[str, dict[str, float]] = {}
    for element in project.elements:
        indexes = _element_indexes(element, dof_index)
        local_k, transform, _ = _element_matrices(project, element)
        local_displacements = transform @ displacements[indexes]
        fixed_load = element_fixed_loads.get(element.id, np.zeros(6, dtype=float))
        local_end_forces = local_k @ local_displacements - fixed_load
        result[element.id] = {
            label: float(local_end_forces[position]) for position, label in enumerate(labels)
        }
    return result


def _map_element_diagrams(
    project: Project,
    element_end_forces: dict[str, dict[str, float]],
    load_integrals: dict[str, dict[str, object]],
) -> dict[str, list[dict[str, float]]]:
    diagrams: dict[str, list[dict[str, float]]] = {}
    for element in project.elements:
        _, _, length = _element_matrices(project, element)
        forces = element_end_forces[element.id]
        integrals = load_integrals.get(element.id)
        rows: list[dict[str, float]] = []
        for position in np.linspace(0.0, length, 21):
            q_integral = _interpolated_integrals(integrals, position) if integrals else {}
            # Sign conventions along the local x axis of the element:
            # axial N is tension-positive, shear V is the resultant of the
            # transverse forces to the left of the section, and bending moment
            # M is positive when the lower fibre (local -y side) is in tension.
            # Equilibrium of the segment [0, x]: n_i + ∫qx + Σfx + N = 0.
            axial = -forces["n_i"] - float(q_integral.get("axial", 0.0))
            shear = forces["v_i"] + float(q_integral.get("shear", 0.0))
            moment = -forces["m_i"] + forces["v_i"] * position + float(q_integral.get("moment", 0.0))
            rows.append(
                {
                    "x": float(position),
                    "ratio": float(position / length if length else 0.0),
                    "n": float(axial),
                    "v": float(shear),
                    "m": float(moment),
                }
            )
        diagrams[element.id] = rows
    return diagrams


def _interpolated_integrals(integrals: dict[str, object], position: float) -> dict[str, float]:
    x_values = np.asarray(integrals["x"])
    result = {
        "axial": float(np.interp(position, x_values, np.asarray(integrals["axial"]))),
        "shear": float(np.interp(position, x_values, np.asarray(integrals["shear"]))),
        "moment": float(np.interp(position, x_values, np.asarray(integrals["moment"]))),
    }
    for event in integrals.get("point_events", []):
        event_x = float(event["x"])
        if position + 1e-12 < event_x:
            continue
        # A concentrated local +x force to the left of the section enters the
        # axial resultant exactly like the distributed qx integral; the
        # tension-positive sign is applied once in `_map_element_diagrams`.
        result["axial"] += float(event["fx"])
        result["shear"] += float(event["fy"])
        result["moment"] += float(event["fy"]) * (position - event_x) - float(event["mz"])
    return result


def _build_summary(
    project: Project,
    displacements: dict[str, dict[str, float]],
    reactions: dict[str, dict[str, float]],
    element_end_forces: dict[str, dict[str, float]],
    element_diagrams: dict[str, list[dict[str, float]]],
) -> dict[str, object]:
    max_translation = {"node": "", "value": 0.0}
    max_rotation = {"node": "", "value": 0.0}
    for node_id, values in displacements.items():
        translation = math.hypot(values.get("ux", 0.0), values.get("uy", 0.0))
        rotation = abs(values.get("rz", 0.0))
        if translation > float(max_translation["value"]):
            max_translation = {"node": node_id, "value": float(translation)}
        if rotation > float(max_rotation["value"]):
            max_rotation = {"node": node_id, "value": float(rotation)}

    dangerous = _dangerous_sections(element_diagrams)
    zero_force_elements = _zero_force_elements(element_end_forces)
    flexibility = _load_point_flexibility(project, displacements)
    reaction_totals = _reaction_totals(reactions)

    return {
        "max_translation": max_translation,
        "max_rotation": max_rotation,
        "dangerous_sections": dangerous,
        "zero_force_elements": zero_force_elements,
        "load_point_flexibility": flexibility,
        "reaction_totals": reaction_totals,
    }


def _dangerous_sections(element_diagrams: dict[str, list[dict[str, float]]]) -> list[dict[str, float | str]]:
    candidates: list[dict[str, float | str]] = []
    for element_id, rows in element_diagrams.items():
        for row in rows:
            candidates.append(
                {
                    "element": element_id,
                    "x": row["x"],
                    "ratio": row["ratio"],
                    "moment": row["m"],
                    "abs_moment": abs(row["m"]),
                }
            )
    candidates.sort(key=lambda item: float(item["abs_moment"]), reverse=True)
    return candidates[:5]


def _zero_force_elements(element_end_forces: dict[str, dict[str, float]]) -> list[str]:
    all_values = [abs(value) for forces in element_end_forces.values() for value in forces.values()]
    reference = max(all_values, default=0.0)
    tolerance = max(1e-6, reference * 1e-8)
    result: list[str] = []
    for element_id, forces in element_end_forces.items():
        if max(abs(value) for value in forces.values()) <= tolerance:
            result.append(element_id)
    return result


def _load_point_flexibility(
    project: Project,
    displacements: dict[str, dict[str, float]],
) -> list[dict[str, float | str]]:
    values: list[dict[str, float | str]] = []
    for load in project.nodal_loads:
        displacement = displacements.get(load.node, {})
        force_magnitude = math.hypot(load.fx, load.fy)
        if force_magnitude > 0.0:
            projected = (displacement.get("ux", 0.0) * load.fx + displacement.get("uy", 0.0) * load.fy) / force_magnitude
            values.append(
                {
                    "node": load.node,
                    "kind": "translation",
                    "load": force_magnitude,
                    "displacement": projected,
                    "flexibility": projected / force_magnitude,
                }
            )
        if abs(load.mz) > 0.0:
            rotation = displacement.get("rz", 0.0)
            values.append(
                {
                    "node": load.node,
                    "kind": "rotation",
                    "load": abs(load.mz),
                    "displacement": rotation,
                    "flexibility": rotation / load.mz,
                }
            )
    return values


def _reaction_totals(reactions: dict[str, dict[str, float]]) -> dict[str, float]:
    totals = {"fx": 0.0, "fy": 0.0, "mz": 0.0}
    for values in reactions.values():
        for key in totals:
            totals[key] += float(values.get(key, 0.0))
    return totals
