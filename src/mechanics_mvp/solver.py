"""2D frame finite element solver."""

from __future__ import annotations

import math

import numpy as np

from .models import DOFS, AnalysisResult, Element, ElementLoad, Node, Project
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

        # Inclined supports: rotate the translational DOFs of every node with a
        # support angle into the support axes (x' along the ground, y' normal to
        # it) with the block-diagonal matrix T, so the restraints can be applied
        # as ordinary fixed DOFs: K' = T K Tᵀ, P' = T P, u = Tᵀ u'.
        support_rotation = _support_rotation(project, dof_index)
        rotated_stiffness = support_rotation @ stiffness @ support_rotation.T
        rotated_loads = support_rotation @ loads

        coupling_matrix = _coupling_matrix(project, dof_index)
        restrained_array = np.asarray(restrained, dtype=int)
        free = np.setdiff1d(np.arange(total_dofs), restrained_array)
        free = _active_free_dofs(rotated_stiffness, rotated_loads, free, total_dofs)
        k_ff = rotated_stiffness[np.ix_(free, free)]
        p_f = rotated_loads[free]
        system = classify_system(project)
        basis = None
        constraint_rank = 0
        if len(coupling_matrix):
            # Solve in the null space of the independent kinematic constraints.
            # This keeps stiffness units out of the constraint rank decision.
            c_free = (coupling_matrix @ support_rotation.T)[:, free]
            left, singular, right = np.linalg.svd(c_free, full_matrices=True)
            tolerance = np.finfo(float).eps * max(c_free.shape) * max(1.0, singular.max(initial=0.0))
            constraint_rank = int(np.count_nonzero(singular > tolerance))
            basis = right[constraint_rank:].T
            reduced_k = basis.T @ k_ff @ basis
            reduced_p = basis.T @ p_f
            system = classify_system(project, constraint_rank)
        else:
            reduced_k, reduced_p = k_ff, p_f

        if reduced_k.size and np.linalg.matrix_rank(reduced_k) < len(reduced_k):
            raise SolverError(unstable_system_message(system))
        try:
            reduced_u = np.linalg.solve(reduced_k, reduced_p)
        except np.linalg.LinAlgError as exc:
            raise SolverError(unstable_system_message(system)) from exc
        u_free = reduced_u if basis is None else basis @ reduced_u
        rotated_u = np.zeros(total_dofs)
        rotated_u[free] = u_free
        displacements = support_rotation.T @ rotated_u
        reactions_vector = stiffness @ displacements - loads
        if constraint_rank:
            residual = p_f - k_ff @ u_free
            multipliers = left[:, :constraint_rank] @ ((right[:constraint_rank] @ residual) / singular[:constraint_rank])
            reactions_vector += coupling_matrix.T @ multipliers

        displacement_map = _map_node_vectors(project, displacements, dof_index)
        reaction_map = _map_reactions(project, reactions_vector, dof_index, restrained_array)
        element_end_forces, force_tolerances = _map_element_forces(
            project,
            displacements,
            dof_index,
            element_fixed_loads,
        )
        element_diagrams, extrema_sampled = _map_element_diagrams(project, element_end_forces, load_integrals)
        summary = _build_summary(
            project,
            displacement_map,
            reaction_map,
            element_end_forces,
            element_diagrams,
            force_tolerances,
            extrema_sampled=extrema_sampled,
        )
        summary["system"] = system

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


def _active_free_dofs(
    stiffness: np.ndarray, loads: np.ndarray, free: np.ndarray, original_dof_count: int
) -> np.ndarray:
    active: list[int] = []
    for index in free:
        if (
            int(index) < original_dof_count
            and int(index) % 3 == 2
            and np.all(stiffness[int(index), :] == 0.0)
            and loads[int(index)] == 0.0
        ):
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
    """Equivalent local nodal load integrated analytically.

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

    # Integrate a monomial r^k against the linear axial and cubic Hermite
    # transverse shapes analytically in r=x/L. No quadrature order cutoff.
    result = np.zeros(6, dtype=float)
    for k, coefficient in enumerate(_axis_polynomial(load, "x")):
        result[0] += coefficient * length / ((k + 1) * (k + 2))
        result[3] += coefficient * length / (k + 2)
    for k, coefficient in enumerate(_axis_polynomial(load, "y")):
        total = coefficient * length
        result[1] += total * 6 / ((k + 1) * (k + 3) * (k + 4))
        result[2] += total * length * 2 / ((k + 2) * (k + 3) * (k + 4))
        result[4] += total * (k + 6) / ((k + 3) * (k + 4))
        result[5] -= total * length / ((k + 3) * (k + 4))
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


def _axis_polynomial(load: ElementLoad, axis: str) -> tuple[float, ...]:
    if load.kind == "uniform_local":
        return (load.qx if axis == "x" else load.qy,)
    if load.kind == "linear_local":
        start = _axis_attr(load, axis, "i")
        end = _axis_attr(load, axis, "j")
        if start is None:
            start = load.qx if axis == "x" else load.qy
        if end is None:
            end = start
        return (start, end - start)
    if load.kind == "polynomial_local":
        coefficients = load.qx_coefficients if axis == "x" else load.qy_coefficients
        return tuple(coefficients) or (0.0,)
    raise SolverError(f"Unsupported element load kind: {load.kind!r}")


def _evaluate_polynomial(coefficients: tuple[float, ...], ratio: float) -> float:
    return sum(coefficient * ratio**power for power, coefficient in enumerate(coefficients))


def _integrated_load_polynomials(
    coefficients: tuple[float, ...], length: float
) -> tuple[tuple[float, ...], tuple[float, ...]]:
    first = (0.0,) + tuple(
        coefficient * length / (power + 1) for power, coefficient in enumerate(coefficients)
    )
    second = (0.0, 0.0) + tuple(
        coefficient * length**2 / ((power + 1) * (power + 2))
        for power, coefficient in enumerate(coefficients)
    )
    return first, second


def _polynomial_samples(coefficients: tuple[float, ...], samples: np.ndarray, length: float) -> np.ndarray:
    return np.array([_evaluate_polynomial(coefficients, float(x) / length) for x in samples], dtype=float)


def _load_integrals(load: ElementLoad, length: float, transform: np.ndarray) -> dict[str, object]:
    samples = np.linspace(0.0, length, 41)
    zeros = np.zeros_like(samples, dtype=float)
    zero_polynomial = (0.0,)
    if load.kind == "uniform_moment_local":
        moment_polynomial = (0.0, -float(load.mz) * length)
        return {
            "x": samples,
            "qx": zeros.copy(),
            "qy": zeros.copy(),
            "axial": zeros.copy(),
            "shear": zeros.copy(),
            "moment": _polynomial_samples(moment_polynomial, samples, length),
            "axial_polynomial": zero_polynomial,
            "shear_polynomial": zero_polynomial,
            "moment_polynomial": moment_polynomial,
            "point_events": [],
        }
    if load.kind == "point_global":
        if load.ratio is None:
            raise SolverError(f"Point load on element {load.element} has no position ratio.")
        local_fx, local_fy = _point_load_local_components(load, transform)
        return {
            "x": samples,
            "qx": zeros.copy(),
            "qy": zeros.copy(),
            "axial": zeros.copy(),
            "shear": zeros.copy(),
            "moment": zeros.copy(),
            "axial_polynomial": zero_polynomial,
            "shear_polynomial": zero_polynomial,
            "moment_polynomial": zero_polynomial,
            "point_events": [
                {
                    "x": float(load.ratio) * length,
                    "fx": local_fx,
                    "fy": local_fy,
                    "mz": float(load.mz),
                }
            ],
        }
    qx_coefficients = _axis_polynomial(load, "x")
    qy_coefficients = _axis_polynomial(load, "y")
    axial_polynomial, _ = _integrated_load_polynomials(qx_coefficients, length)
    shear_polynomial, moment_polynomial = _integrated_load_polynomials(qy_coefficients, length)
    return {
        "x": samples,
        "qx": np.array([_evaluate_axis_load(load, "x", x / length) for x in samples], dtype=float),
        "qy": np.array([_evaluate_axis_load(load, "y", x / length) for x in samples], dtype=float),
        "axial": _polynomial_samples(axial_polynomial, samples, length),
        "shear": _polynomial_samples(shear_polynomial, samples, length),
        "moment": _polynomial_samples(moment_polynomial, samples, length),
        "axial_polynomial": axial_polynomial,
        "shear_polynomial": shear_polynomial,
        "moment_polynomial": moment_polynomial,
        "point_events": [],
    }


def _merge_polynomials(existing: tuple[float, ...], current: tuple[float, ...]) -> tuple[float, ...]:
    size = max(len(existing), len(current))
    return tuple(
        (existing[index] if index < len(existing) else 0.0)
        + (current[index] if index < len(current) else 0.0)
        for index in range(size)
    )


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
        "axial_polynomial": _merge_polynomials(existing["axial_polynomial"], current["axial_polynomial"]),
        "shear_polynomial": _merge_polynomials(existing["shear_polynomial"], current["shear_polynomial"]),
        "moment_polynomial": _merge_polynomials(existing["moment_polynomial"], current["moment_polynomial"]),
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


def classify_system(project: Project, independent_couplings: int | None = None) -> dict[str, object]:
    """Kinematic degree-of-freedom count W of the plane structure.

    Every member is a rigid body (3 DOFs) and every joint is a rigid body
    (3 DOFs). A rigid member-joint connection removes 3 DOFs, a hinged one
    (moment release, or either end of a truss bar) removes 2, so each hinged
    connection leaves one extra DOF. A joint whose connections are all hinged
    is a pin joint: its own rotation is not a physical DOF, so it is removed
    and an rz restraint at such a joint is not counted. Support restraints
    and coupled translational DOFs each remove one DOF::

        W = 3N - 3m + h - r - c - N_pin

    For rigid-jointed frames this is the textbook W = 3N - 3m - r. W > 0 is
    a mechanism; W <= 0 is only a necessary condition for stability, the
    sufficient check is the rank of the stiffness matrix.
    """

    hinged_connections = 0
    hinged_at_node: dict[str, int] = {node.id: 0 for node in project.nodes}
    connections_at_node: dict[str, int] = {node.id: 0 for node in project.nodes}
    for element in project.elements:
        connections_at_node[element.node_i] += 1
        connections_at_node[element.node_j] += 1
        if element.type == "truss":
            hinged_connections += 2
            hinged_at_node[element.node_i] += 1
            hinged_at_node[element.node_j] += 1
            continue
        if element.moment_release_i:
            hinged_connections += 1
            hinged_at_node[element.node_i] += 1
        if element.moment_release_j:
            hinged_connections += 1
            hinged_at_node[element.node_j] += 1

    pin_joints = [
        node.id
        for node in project.nodes
        if connections_at_node[node.id] > 0 and hinged_at_node[node.id] == connections_at_node[node.id]
    ]
    pin_joint_set = set(pin_joints)
    restraints = 0
    for node in project.nodes:
        restraints += int(node.restraints[0]) + int(node.restraints[1])
        if node.restraints[2] and node.id not in pin_joint_set:
            restraints += 1

    joints = len(project.nodes)
    members = len(project.elements)
    coupled_dofs = sum(len(coupling.dofs) for coupling in project.couplings)
    if independent_couplings is not None:
        coupled_dofs = independent_couplings
    freedom = 3 * joints - 3 * members + hinged_connections - restraints - coupled_dofs - len(pin_joints)
    if freedom > 0:
        classification = "unstable"
    elif freedom == 0:
        classification = "determinate"
    else:
        classification = "indeterminate"
    return {
        "degrees_of_freedom": int(freedom),
        "indeterminacy": int(max(0, -freedom)),
        "joints": int(joints),
        "members": int(members),
        "restraints": int(restraints),
        "coupled_dofs": int(coupled_dofs),
        "hinged_connections": int(hinged_connections),
        "pin_joints": int(len(pin_joints)),
        "classification": classification,
    }


def unstable_system_message(system: dict[str, object]) -> str:
    freedom = int(system["degrees_of_freedom"])
    if freedom > 0:
        return (
            f"体系判断：几何可变体系（常变），计算自由度 W = {freedom} > 0，刚度矩阵奇异，无法求解。"
            "请补充支座或杆件约束。"
            f" [Structure is geometrically unstable: W = {freedom} > 0.]"
        )
    return (
        f"体系判断：约束数量满足 W = {freedom} ≤ 0，但约束布置不当（反力平行或汇交、局部机构），"
        "刚度矩阵奇异，属于瞬变或几何可变体系，无法求解。请检查支座方向、铰的位置和杆件连通性。"
        f" [Structure is geometrically unstable: W = {freedom} <= 0 but the restraints are improperly arranged.]"
    )


def _is_inclined(node: Node) -> bool:
    return abs(math.remainder(float(node.support_angle), 360.0)) > 1e-9


def _coupling_matrix(project: Project, dof_index: dict[tuple[str, str], int]) -> np.ndarray:
    row_count = sum(len(coupling.dofs) for coupling in project.couplings)
    matrix = np.zeros((row_count, len(project.nodes) * len(DOFS)), dtype=float)
    row = 0
    for coupling in project.couplings:
        for dof in coupling.dofs:
            matrix[row, dof_index[(coupling.node_i, dof)]] = 1.0
            matrix[row, dof_index[(coupling.node_j, dof)]] = -1.0
            row += 1
    return matrix


def _support_rotation(project: Project, dof_index: dict[tuple[str, str], int]) -> np.ndarray:
    """Block-diagonal rotation from global nodal DOFs to support-aligned DOFs.

    For a node whose support is rotated by θ (counter-clockwise), the support
    axes are x' = (cos θ, sin θ) and y' = (-sin θ, cos θ); ``u' = T u``.
    Rotations rz are unchanged. Nodes without an angle keep the identity.
    """

    size = len(project.nodes) * len(DOFS)
    rotation = np.eye(size, dtype=float)
    for node in project.nodes:
        if not _is_inclined(node):
            continue
        angle = math.radians(float(node.support_angle))
        cosine, sine = math.cos(angle), math.sin(angle)
        ux = dof_index[(node.id, "ux")]
        uy = dof_index[(node.id, "uy")]
        rotation[ux, ux] = cosine
        rotation[ux, uy] = sine
        rotation[uy, ux] = -sine
        rotation[uy, uy] = cosine
    return rotation


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
        inclined_translation = _is_inclined(node) and (node.restraints[0] or node.restraints[1])
        for dof in DOFS:
            index = dof_index[(node.id, dof)]
            if index in restrained_set or (inclined_translation and dof in ("ux", "uy")):
                node_reactions[REACTION_LABELS[dof]] = float(reactions[index])
        if node_reactions:
            result[node.id] = node_reactions
    return result


def _map_element_forces(
    project: Project,
    displacements: np.ndarray,
    dof_index: dict[tuple[str, str], int],
    element_fixed_loads: dict[str, np.ndarray],
) -> tuple[dict[str, dict[str, float]], dict[str, np.ndarray]]:
    tolerances: dict[str, np.ndarray] = {}
    labels = ("n_i", "v_i", "m_i", "n_j", "v_j", "m_j")
    result: dict[str, dict[str, float]] = {}
    for element in project.elements:
        indexes = _element_indexes(element, dof_index)
        local_k, transform, length = _element_matrices(project, element)
        local_displacements = transform @ displacements[indexes]
        fixed_load = element_fixed_loads.get(element.id, np.zeros(6, dtype=float))
        roundoff = 64 * np.finfo(float).eps * (np.abs(local_k) @ np.abs(transform) @ np.abs(displacements[indexes]) + np.abs(fixed_load))
        bounds = np.maximum(roundoff[:3], roundoff[3:])
        bounds[2] += bounds[1] * length
        tolerances[element.id] = bounds
        local_end_forces = local_k @ local_displacements - fixed_load
        result[element.id] = {
            label: float(local_end_forces[position]) for position, label in enumerate(labels)
        }
    return result, tolerances


def _interior_roots(polynomial: np.polynomial.Polynomial, low: float, high: float) -> list[float]:
    roots, _ = _interior_roots_checked(polynomial, low, high)
    return roots


def _interior_roots_checked(
    polynomial: np.polynomial.Polynomial, low: float, high: float
) -> tuple[list[float], bool]:
    # Finding every root uses a dense companion matrix. Bound that allocation for
    # high-degree loads; the result and report mark those extrema as sampled.
    trimmed = polynomial.trim()
    if trimmed.degree() > 128:
        return [], True
    if trimmed.degree() <= 0:
        return [], False
    imag_tol = 1e-6 * max(1.0, high - low)
    return (
        [
            float(root.real)
            for root in trimmed.roots()
            if abs(root.imag) <= imag_tol and low < root.real < high
        ],
        False,
    )


def _critical_positions(
    integrals: dict, forces: dict, length: float, modulus_over_area: float
) -> tuple[set[float], bool]:
    poly = np.polynomial.Polynomial
    ratios: set[float] = set()
    truncated = False
    for key in ("axial_polynomial", "shear_polynomial"):
        roots, cut = _interior_roots_checked(poly(integrals[key]).deriv(), 0.0, 1.0)
        ratios.update(roots)
        truncated = truncated or cut
    # Between point loads the derivative of the bending moment is a polynomial.
    slope = poly(integrals["moment_polynomial"]).deriv() + length * forces["v_i"]
    left = 0.0
    axial_slope = -poly(integrals["axial_polynomial"]).deriv() * modulus_over_area
    events = sorted(integrals["point_events"], key=lambda item: item["x"])
    boundaries = [(event["x"] / length, event["fy"]) for event in events]
    boundaries.append((1.0, 0.0))
    for right, shear_jump in boundaries:
        roots, cut = _interior_roots_checked(slope, left, right)
        ratios.update(roots)
        truncated = truncated or cut
        if np.any(axial_slope.coef) and np.any(slope.coef):
            # Stationary values on either extreme fibre: W N'/A ± M' = 0.
            for stress_slope in (axial_slope + slope, axial_slope - slope):
                roots, cut = _interior_roots_checked(stress_slope, left, right)
                ratios.update(roots)
                truncated = truncated or cut
        slope = slope + length * shear_jump
        left = right
    return {r * length for r in ratios}, truncated


def _merge_sample_positions(
    base_positions: list[float],
    critical_positions: set[float],
    event_positions: list[float],
    length: float,
) -> list[float]:
    tol = 1e-9 * max(1.0, length)
    merged: list[float] = list(base_positions)
    for pos in sorted(critical_positions):
        if not any(abs(pos - existing) <= tol for existing in merged):
            merged.append(pos)
    exact_events: set[float] = set()
    for x in event_positions:
        exact_events.add(x)
        if x > 0.0:
            exact_events.add(math.nextafter(x, 0.0))
    # Preserve exact event positions and their left limits unconditionally;
    # drop only non-event points that would duplicate an event right limit.
    filtered = [
        pos for pos in merged
        if not any(abs(pos - ev) <= tol and pos != ev for ev in event_positions)
    ]
    return sorted(set(filtered) | exact_events)


def _map_element_diagrams(
    project: Project,
    element_end_forces: dict[str, dict[str, float]],
    load_integrals: dict[str, dict[str, object]],
) -> tuple[dict[str, list[dict[str, float]]], bool]:
    diagrams: dict[str, list[dict[str, float]]] = {}
    extrema_sampled = False
    sections = {section.id: section for section in project.sections}
    materials = {material.id: material for material in project.materials}
    for element in project.elements:
        section = sections[element.section]
        elastic_modulus = materials[element.material].elastic_modulus
        _, _, length = _element_matrices(project, element)
        forces = element_end_forces[element.id]
        integrals = load_integrals.get(element.id)
        rows: list[dict[str, float]] = []
        base_positions = [float(x) for x in np.linspace(0.0, length, 21)]
        if integrals:
            critical, cut = _critical_positions(
                integrals, forces, length, section.plane_bending_modulus / section.area
            )
            extrema_sampled = extrema_sampled or cut
            event_positions = [float(event["x"]) for event in integrals.get("point_events", [])]
            positions = _merge_sample_positions(base_positions, critical, event_positions, length)
        else:
            positions = base_positions
        for position in positions:
            q_integral = _load_integrals_at(integrals, position) if integrals else {}
            # Sign conventions along the local x axis of the element:
            # axial N is tension-positive, shear V is the resultant of the
            # transverse forces to the left of the section, and bending moment
            # M is positive when the lower fibre (local -y side) is in tension.
            # Equilibrium of the segment [0, x]: n_i + ∫qx + Σfx + N = 0.
            axial = -forces["n_i"] - float(q_integral.get("axial", 0.0))
            shear = forces["v_i"] + float(q_integral.get("shear", 0.0))
            moment = -forces["m_i"] + forces["v_i"] * position + float(q_integral.get("moment", 0.0))
            stress = section.extreme_normal_stress(axial, moment)
            rows.append(
                {
                    "x": float(position),
                    "ratio": float(position / length if length else 0.0),
                    "n": float(axial),
                    "v": float(shear),
                    "m": float(moment),
                    "stress": float(stress),
                    "strain": float(stress / elastic_modulus),
                }
            )
        diagrams[element.id] = rows
    return diagrams, extrema_sampled


def _load_integrals_at(integrals: dict[str, object], position: float) -> dict[str, float]:
    x_values = np.asarray(integrals["x"])
    ratio = float(position / x_values[-1])
    result = {
        component: _evaluate_polynomial(integrals[f"{component}_polynomial"], ratio)
        for component in ("axial", "shear", "moment")
    }
    for event in integrals.get("point_events", []):
        event_x = float(event["x"])
        if position < event_x:
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
    force_tolerances: dict[str, np.ndarray],
    *,
    extrema_sampled: bool = False,
) -> dict[str, object]:
    max_translation = {"node": project.nodes[0].id, "value": 0.0}
    max_rotation = {"node": project.nodes[0].id, "value": 0.0}
    for node_id, values in displacements.items():
        translation = math.hypot(values.get("ux", 0.0), values.get("uy", 0.0))
        rotation = abs(values.get("rz", 0.0))
        if translation > float(max_translation["value"]):
            max_translation = {"node": node_id, "value": float(translation)}
        if rotation > float(max_rotation["value"]):
            max_rotation = {"node": node_id, "value": float(rotation)}

    dangerous = _dangerous_sections(element_diagrams)
    zero_force_elements = _zero_force_elements(element_end_forces, element_diagrams, force_tolerances)
    flexibility = _load_point_flexibility(project, displacements)
    reaction_totals = _reaction_totals(reactions)

    return {
        "max_translation": max_translation,
        "max_rotation": max_rotation,
        "extrema_sampled": extrema_sampled,
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
    unique: list[dict[str, float | str]] = []
    for candidate in candidates:
        if any(
            existing["element"] == candidate["element"]
            and math.isclose(float(existing["x"]), float(candidate["x"]), rel_tol=1e-9, abs_tol=1e-9)
            and math.isclose(float(existing["moment"]), float(candidate["moment"]), rel_tol=1e-9, abs_tol=1e-9)
            for existing in unique
        ):
            continue
        unique.append(candidate)
        if len(unique) >= 5:
            break
    return unique


def _zero_force_elements(
    element_end_forces: dict[str, dict[str, float]],
    element_diagrams: dict[str, list[dict[str, float]]],
    tolerances: dict[str, np.ndarray],
) -> list[str]:
    result = []
    for element, end_forces in element_end_forces.items():
        bounds = tolerances[element]
        for key, limit in zip(("n", "v", "m"), bounds):
            if max(abs(end_forces[key + "_i"]), abs(end_forces[key + "_j"])) > limit:
                break
            if any(abs(row[key]) > limit for row in element_diagrams[element]):
                break
        else:
            result.append(element)
    return result


def _flexibility_load_points(project: Project) -> list[tuple[str, float, float, float, float, float]]:
    points = [(load.node, load.fx, load.fy, load.mz) for load in project.nodal_loads]
    elements = {element.id: element for element in project.elements}
    for load in project.element_loads:
        if load.kind != "point_global" or load.ratio is None:
            continue
        at_start = math.isclose(load.ratio, 0.0, abs_tol=1e-12)
        at_end = math.isclose(load.ratio, 1.0, abs_tol=1e-12)
        if not (at_start or at_end):
            continue
        element = elements[load.element]
        node_id = element.node_i if at_start else element.node_j
        points.append((node_id, load.fx, load.fy, load.mz))
    totals: dict[str, np.ndarray] = {}
    scales: dict[str, list[float]] = {}
    for node, fx, fy, mz in points:
        if node not in totals:
            totals[node] = np.zeros(3)
            scales[node] = [0.0, 0.0]
        totals[node] += (fx, fy, mz)
        scales[node][0] += math.hypot(fx, fy)
        scales[node][1] += abs(mz)
    return [
        (node, float(fx), float(fy), float(mz), scales[node][0], scales[node][1])
        for node, (fx, fy, mz) in totals.items()
    ]


def _load_point_flexibility(
    project: Project,
    displacements: dict[str, dict[str, float]],
) -> list[dict[str, float | str]]:
    values: list[dict[str, float | str]] = []
    for node_id, fx, fy, mz, force_scale, moment_scale in _flexibility_load_points(project):
        displacement = displacements.get(node_id, {})
        force_magnitude = math.hypot(fx, fy)
        if force_magnitude > 1e-12 * force_scale:
            projected = (displacement.get("ux", 0.0) * fx + displacement.get("uy", 0.0) * fy) / force_magnitude
            values.append(
                {
                    "node": node_id,
                    "kind": "translation",
                    "load": force_magnitude,
                    "displacement": projected,
                    "flexibility": projected / force_magnitude,
                }
            )
        if abs(mz) > 1e-12 * moment_scale:
            # Same convention as a force: the printed load is the magnitude,
            # the printed rotation is the component along that moment, and
            # flexibility is that component divided by the magnitude. That
            # equals the signed rotation divided by the signed moment.
            rotation = float(displacement.get("rz", 0.0))
            moment_magnitude = abs(mz)
            projected = rotation if mz > 0.0 else -rotation
            values.append(
                {
                    "node": node_id,
                    "kind": "rotation",
                    "load": moment_magnitude,
                    "displacement": projected,
                    "flexibility": projected / moment_magnitude,
                }
            )
    return values


def _reaction_totals(reactions: dict[str, dict[str, float]]) -> dict[str, float]:
    totals = {"fx": 0.0, "fy": 0.0, "mz": 0.0}
    for values in reactions.values():
        for key in totals:
            totals[key] += float(values.get(key, 0.0))
    return totals
