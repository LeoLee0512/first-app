"""Three-dimensional Euler-Bernoulli frame analysis with torsion."""

from __future__ import annotations

import math
from dataclasses import fields

import numpy as np

from .models import AnalysisResult, Element, Material, Node, Project, Section, SPATIAL_DOFS
from .preprocess import ValidationError, validate_size
from .solver import SolverError, _interior_roots

REACTION_LABELS = {"ux": "fx", "uy": "fy", "uz": "fz", "rx": "mx", "ry": "my", "rz": "mz"}
RIGID_STIFFNESS_FACTOR = 1_000_000.0


class Frame3DSolver:
    def solve(self, project: Project) -> AnalysisResult:
        _validate_spatial_project(project)
        nodes = {node.id: node for node in project.nodes}
        materials = {material.id: material for material in project.materials}
        sections = {section.id: section for section in project.sections}
        dof_index = {
            (node.id, dof): node_pos * len(SPATIAL_DOFS) + dof_pos
            for node_pos, node in enumerate(project.nodes)
            for dof_pos, dof in enumerate(SPATIAL_DOFS)
        }
        total_dofs = len(project.nodes) * len(SPATIAL_DOFS)
        stiffness = np.zeros((total_dofs, total_dofs), dtype=float)
        loads = np.zeros(total_dofs, dtype=float)
        fixed_loads: dict[str, np.ndarray] = {}
        distributed_loads: dict[str, list[np.ndarray]] = {}
        transforms: dict[str, tuple[np.ndarray, np.ndarray, float]] = {}

        for element in project.elements:
            local_k, transform, rotation, length = _element_data(nodes, materials, sections, element)
            transforms[element.id] = (transform, rotation, length)
            indexes = _element_indexes(element, dof_index)
            _assemble_matrix(stiffness, transform.T @ local_k @ transform, indexes)

        for load in project.nodal_loads:
            values = (load.fx, load.fy, load.fz, load.mx, load.my, load.mz)
            for dof, value in zip(SPATIAL_DOFS, values):
                loads[dof_index[(load.node, dof)]] += value

        for load in project.element_loads:
            element = next(item for item in project.elements if item.id == load.element)
            transform, rotation, length = transforms[element.id]
            local_q = rotation @ np.array([load.fx, load.fy, load.fz], dtype=float)
            fixed = _uniform_fixed_load(local_q, length)
            indexes = _element_indexes(element, dof_index)
            loads[indexes] += transform.T @ fixed
            fixed_loads[element.id] = fixed_loads.get(element.id, np.zeros(12, dtype=float)) + fixed
            distributed_loads.setdefault(element.id, []).append(local_q)

        restrained = [
            dof_index[(node.id, dof)]
            for node in project.nodes
            for dof, is_restrained in zip(SPATIAL_DOFS, node.restraints_3d)
            if is_restrained
        ]
        free = np.array([index for index in range(total_dofs) if index not in restrained], dtype=int)
        # support_angle rotates horizontal translational (ux, uy) and rotational
        # (rx, ry) constraints about the global z axis.
        support_axes = None
        if any(_is_inclined(node) for node in project.nodes):
            support_axes = np.eye(total_dofs)
            for node in project.nodes:
                if not _is_inclined(node):
                    continue
                i = dof_index[(node.id, "ux")]
                angle = math.radians(node.support_angle)
                c, s = math.cos(angle), math.sin(angle)
                rot2 = ((c, s), (-s, c))
                support_axes[i : i + 2, i : i + 2] = rot2
                support_axes[i + 3 : i + 5, i + 3 : i + 5] = rot2
        if support_axes is None:
            k_ff = stiffness[np.ix_(free, free)]
            p_f = loads[free]
        else:
            axes_free = support_axes[free]
            k_ff = axes_free @ stiffness @ axes_free.T
            p_f = axes_free @ loads
        if free.size and np.linalg.matrix_rank(k_ff) < k_ff.shape[0]:
            raise SolverError("三维体系刚度矩阵奇异：存在机构或约束布置不当，无法求解。")
        displacements = np.zeros(total_dofs, dtype=float)
        try:
            displacements[free] = np.linalg.solve(k_ff, p_f)
        except np.linalg.LinAlgError as exc:
            raise SolverError("三维体系刚度矩阵奇异：存在机构或约束布置不当，无法求解。") from exc

        if support_axes is not None:
            displacements = support_axes.T @ displacements
        reactions_vector = stiffness @ displacements - loads
        displacement_map = _map_node_vectors(project, displacements, dof_index)
        reaction_map = _map_reactions(project, reactions_vector, dof_index)
        end_forces, force_tolerances = _map_element_forces(
            project,
            nodes,
            materials,
            sections,
            transforms,
            fixed_loads,
            displacements,
            dof_index,
        )
        diagrams = _map_diagrams(project, transforms, end_forces, distributed_loads)
        summary = _build_summary(
            project,
            displacement_map,
            reaction_map,
            end_forces,
            diagrams,
            force_tolerances,
        )
        return AnalysisResult(displacement_map, reaction_map, end_forces, diagrams, summary)


def _validate_spatial_project(project: Project) -> None:
    validate_size(project, 3)
    for collection in (project.nodes, project.materials, project.sections, project.nodal_loads, project.element_loads):
        for item in collection:
            for field in fields(item):
                value = getattr(item, field.name)
                values = value if isinstance(value, tuple) else (value,)
                if any(isinstance(v, (int, float)) and not math.isfinite(v) for v in values):
                    raise ValidationError(f"Non-finite physical value: {field.name}.")
    if not project.nodes or not project.elements:
        raise ValidationError("三维模型至少需要一个节点和一根杆件。")
    if project.couplings:
        raise ValidationError("frame3d 暂不支持二维节点耦合，请使用 frame2d。")
    for collection, label in ((project.nodes, "node"), (project.materials, "material"), (project.sections, "section"), (project.elements, "element")):
        ids = [item.id for item in collection]
        if len(ids) != len(set(ids)):
            raise ValidationError(f"Duplicate {label} id.")
    nodes = {node.id: node for node in project.nodes}
    materials = {material.id: material for material in project.materials}
    sections = {section.id: section for section in project.sections}
    for material in project.materials:
        if material.elastic_modulus <= 0 or not -1.0 < material.poisson_ratio < 0.5:
            raise ValidationError("三维材料需要正的 E 以及 -1 < ν < 0.5。")
    for section in project.sections:
        values = _section_constants(section)
        if any(value <= 0 for value in values):
            raise ValidationError("三维截面需要正的 A、Iy、Iz 和 J。")
    for element in project.elements:
        if element.node_i not in nodes or element.node_j not in nodes:
            raise ValidationError(f"Element {element.id} references a missing node.")
        if element.material not in materials or element.section not in sections:
            raise ValidationError(f"Element {element.id} references a missing material or section.")
        if element.type not in ("frame", "rigid"):
            raise ValidationError("frame3d 当前仅支持 frame 和 rigid 直杆。")
        if element.moment_release_i or element.moment_release_j:
            raise ValidationError("frame3d 暂不支持杆端弯矩释放。")
        ni, nj = nodes[element.node_i], nodes[element.node_j]
        if math.dist((ni.x, ni.y, ni.z), (nj.x, nj.y, nj.z)) <= 0:
            raise ValidationError(f"Element {element.id} has zero length.")
    for load in project.nodal_loads:
        if load.node not in nodes:
            raise ValidationError(f"Nodal load references missing node {load.node}.")
    element_ids = {element.id for element in project.elements}
    for load in project.element_loads:
        if load.element not in element_ids:
            raise ValidationError(f"Element load references missing element {load.element}.")
        if load.kind != "uniform_global":
            raise ValidationError("frame3d 当前杆件分布荷载仅支持 uniform_global。")


def _section_constants(section: Section) -> tuple[float, float, float, float]:
    iy = section.inertia if section.inertia_y is None else section.inertia_y
    iz = section.inertia if section.inertia_z is None else section.inertia_z
    torsion = -1.0 if section.torsion_constant is None else section.torsion_constant
    return section.area, iy, iz, torsion


def _element_data(
    nodes: dict[str, Node],
    materials: dict[str, Material],
    sections: dict[str, Section],
    element: Element,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, float]:
    ni, nj = nodes[element.node_i], nodes[element.node_j]
    delta = np.array([nj.x - ni.x, nj.y - ni.y, nj.z - ni.z], dtype=float)
    length = float(np.linalg.norm(delta))
    axis_x = delta / length
    reference = np.array([0.0, 0.0, 1.0]) if abs(axis_x[2]) < 0.999 else np.array([0.0, 1.0, 0.0])
    axis_y = np.cross(reference, axis_x)
    axis_y /= np.linalg.norm(axis_y)
    axis_z = np.cross(axis_x, axis_y)
    rotation = np.vstack((axis_x, axis_y, axis_z))
    transform = np.zeros((12, 12), dtype=float)
    for start in (0, 3, 6, 9):
        transform[start : start + 3, start : start + 3] = rotation
    material = materials[element.material]
    section = sections[element.section]
    area, iy, iz, torsion = _section_constants(section)
    modulus = material.elastic_modulus
    shear_modulus = modulus / (2 * (1 + material.poisson_ratio))
    multiplier = RIGID_STIFFNESS_FACTOR if element.type == "rigid" else 1.0
    local_k = _local_stiffness(
        multiplier * modulus * area,
        multiplier * shear_modulus * torsion,
        multiplier * modulus * iy,
        multiplier * modulus * iz,
        length,
    )
    return local_k, transform, rotation, length


def _local_stiffness(ea: float, gj: float, eiy: float, eiz: float, length: float) -> np.ndarray:
    k = np.zeros((12, 12), dtype=float)
    k[0, 0] = k[6, 6] = ea / length
    k[0, 6] = k[6, 0] = -ea / length
    k[3, 3] = k[9, 9] = gj / length
    k[3, 9] = k[9, 3] = -gj / length
    _set_bending(k, (1, 5, 7, 11), eiz, length, False)
    _set_bending(k, (2, 4, 8, 10), eiy, length, True)
    return k


def _set_bending(k: np.ndarray, indexes: tuple[int, int, int, int], ei: float, length: float, about_y: bool) -> None:
    if about_y:
        coefficients = np.array(
            [[12, -6, -12, -6], [-6, 4, 6, 2], [-12, 6, 12, 6], [-6, 2, 6, 4]], dtype=float
        )
    else:
        coefficients = np.array(
            [[12, 6, -12, 6], [6, 4, -6, 2], [-12, -6, 12, -6], [6, 2, -6, 4]], dtype=float
        )
    scale_map = {(0, 0): 1 / length**3, (0, 1): 1 / length**2, (0, 2): 1 / length**3, (0, 3): 1 / length**2,
                 (1, 0): 1 / length**2, (1, 1): 1 / length, (1, 2): 1 / length**2, (1, 3): 1 / length,
                 (2, 0): 1 / length**3, (2, 1): 1 / length**2, (2, 2): 1 / length**3, (2, 3): 1 / length**2,
                 (3, 0): 1 / length**2, (3, 1): 1 / length, (3, 2): 1 / length**2, (3, 3): 1 / length}
    for row in range(4):
        for column in range(4):
            k[indexes[row], indexes[column]] = coefficients[row, column] * ei * scale_map[(row, column)]


def _uniform_fixed_load(q: np.ndarray, length: float) -> np.ndarray:
    fixed = np.zeros(12, dtype=float)
    qx, qy, qz = (float(value) for value in q)
    fixed[0] = fixed[6] = qx * length / 2
    fixed[1] = fixed[7] = qy * length / 2
    fixed[2] = fixed[8] = qz * length / 2
    fixed[5] = qy * length**2 / 12
    fixed[11] = -qy * length**2 / 12
    fixed[4] = -qz * length**2 / 12
    fixed[10] = qz * length**2 / 12
    return fixed


def _element_indexes(element: Element, dof_index: dict[tuple[str, str], int]) -> list[int]:
    return [dof_index[(node_id, dof)] for node_id in (element.node_i, element.node_j) for dof in SPATIAL_DOFS]


def _assemble_matrix(target: np.ndarray, matrix: np.ndarray, indexes: list[int]) -> None:
    for row_pos, row in enumerate(indexes):
        for column_pos, column in enumerate(indexes):
            target[row, column] += matrix[row_pos, column_pos]


def _map_node_vectors(project: Project, vector: np.ndarray, dof_index: dict[tuple[str, str], int]) -> dict[str, dict[str, float]]:
    return {
        node.id: {dof: float(vector[dof_index[(node.id, dof)]]) for dof in SPATIAL_DOFS}
        for node in project.nodes
    }


def _is_inclined(node: Node) -> bool:
    return abs(math.remainder(float(node.support_angle), 360.0)) > 1e-9


def _map_reactions(project: Project, vector: np.ndarray, dof_index: dict[tuple[str, str], int]) -> dict[str, dict[str, float]]:
    result: dict[str, dict[str, float]] = {}
    for node in project.nodes:
        inclined = _is_inclined(node)
        inclined_trans = inclined and any(node.restraints_3d[:2])
        inclined_rot = inclined and any(node.restraints_3d[3:5])
        values = {
            REACTION_LABELS[dof]: float(vector[dof_index[(node.id, dof)]])
            for dof, restrained in zip(SPATIAL_DOFS, node.restraints_3d)
            if restrained
            or (inclined_trans and dof in ("ux", "uy"))
            or (inclined_rot and dof in ("rx", "ry"))
        }
        if values:
            result[node.id] = values
    return result


def _map_element_forces(
    project: Project,
    nodes: dict[str, Node],
    materials: dict[str, Material],
    sections: dict[str, Section],
    transforms: dict[str, tuple[np.ndarray, np.ndarray, float]],
    fixed_loads: dict[str, np.ndarray],
    displacements: np.ndarray,
    dof_index: dict[tuple[str, str], int],
) -> tuple[dict[str, dict[str, float]], dict[str, np.ndarray]]:
    labels = ("n_i", "vy_i", "vz_i", "t_i", "my_i", "mz_i", "n_j", "vy_j", "vz_j", "t_j", "my_j", "mz_j")
    result: dict[str, dict[str, float]] = {}
    tolerances: dict[str, np.ndarray] = {}
    for element in project.elements:
        local_k, _, _, length = _element_data(nodes, materials, sections, element)
        transform, _, _ = transforms[element.id]
        indexes = _element_indexes(element, dof_index)
        local_displacements = transform @ displacements[indexes]
        fixed = fixed_loads.get(element.id, np.zeros(12, dtype=float))
        roundoff = 64 * np.finfo(float).eps * (
            np.abs(local_k) @ np.abs(transform) @ np.abs(displacements[indexes]) + np.abs(fixed)
        )
        bounds = np.maximum(roundoff[:6], roundoff[6:])
        bounds[4] += bounds[2] * length
        bounds[5] += bounds[1] * length
        tolerances[element.id] = bounds
        values = local_k @ local_displacements - fixed
        result[element.id] = {label: float(values[index]) for index, label in enumerate(labels)}
    return result, tolerances


def _map_diagrams(
    project: Project,
    transforms: dict[str, tuple[np.ndarray, np.ndarray, float]],
    end_forces: dict[str, dict[str, float]],
    distributed_loads: dict[str, list[np.ndarray]],
) -> dict[str, list[dict[str, float]]]:
    result: dict[str, list[dict[str, float]]] = {}
    for element in project.elements:
        _, _, length = transforms[element.id]
        forces = end_forces[element.id]
        loads = distributed_loads.get(element.id, [])
        rows: list[dict[str, float]] = []
        qx, qy, qz = sum(loads, np.zeros(3, dtype=float))
        poly = np.polynomial.Polynomial
        my_curve = poly([-forces["my_i"], -forces["vz_i"], -qz / 2])
        mz_curve = poly([-forces["mz_i"], forces["vy_i"], qy / 2])
        positions = [float(x) for x in np.linspace(0.0, length, 21)]
        tol = 1e-9 * max(1.0, length)
        for curve in (my_curve, mz_curve, my_curve**2 + mz_curve**2):
            for root in _interior_roots(curve.deriv(), 0.0, length):
                if not any(abs(root - existing) <= tol for existing in positions):
                    positions.append(root)
        for position in sorted(positions):
            n = -forces["n_i"] - qx * position
            vy = forces["vy_i"] + qy * position
            vz = forces["vz_i"] + qz * position
            torsion = -forces["t_i"]
            my = -forces["my_i"] - forces["vz_i"] * position - qz * position**2 / 2
            mz = -forces["mz_i"] + forces["vy_i"] * position + qy * position**2 / 2
            rows.append(
                {
                    "x": float(position),
                    "ratio": float(position / length),
                    "n": float(n),
                    "vy": float(vy),
                    "vz": float(vz),
                    "t": float(torsion),
                    "my": float(my),
                    "mz": float(mz),
                    "bending": float(math.hypot(my, mz)),
                }
            )
        result[element.id] = rows
    return result


def _zero_force_elements_3d(
    end_forces: dict[str, dict[str, float]],
    diagrams: dict[str, list[dict[str, float]]],
    tolerances: dict[str, np.ndarray],
) -> list[str]:
    keys = ("n", "vy", "vz", "t", "my", "mz")
    result: list[str] = []
    for element_id, forces in end_forces.items():
        bounds = tolerances[element_id]
        for key, limit in zip(keys, bounds):
            if max(abs(forces[f"{key}_i"]), abs(forces[f"{key}_j"])) > limit:
                break
            if any(abs(row[key]) > limit for row in diagrams[element_id]):
                break
        else:
            result.append(element_id)
    return result


def _build_summary(
    project: Project,
    displacements: dict[str, dict[str, float]],
    reactions: dict[str, dict[str, float]],
    end_forces: dict[str, dict[str, float]],
    diagrams: dict[str, list[dict[str, float]]],
    force_tolerances: dict[str, np.ndarray],
) -> dict[str, object]:
    max_translation = {"node": project.nodes[0].id, "value": 0.0}
    max_rotation = {"node": project.nodes[0].id, "value": 0.0}
    for node_id, values in displacements.items():
        translation = math.sqrt(sum(values[dof] ** 2 for dof in ("ux", "uy", "uz")))
        rotation = math.sqrt(sum(values[dof] ** 2 for dof in ("rx", "ry", "rz")))
        if translation > max_translation["value"]:
            max_translation = {"node": node_id, "value": translation}
        if rotation > max_rotation["value"]:
            max_rotation = {"node": node_id, "value": rotation}
    candidates = [
        {"element": element_id, "x": row["x"], "ratio": row["ratio"], "moment": row["bending"], "abs_moment": row["bending"], "torsion": row["t"]}
        for element_id, rows in diagrams.items()
        for row in rows
    ]
    candidates.sort(key=lambda item: item["abs_moment"], reverse=True)
    dangerous: list[dict[str, object]] = []
    for candidate in candidates:
        if any(
            existing["element"] == candidate["element"]
            and math.isclose(float(existing["x"]), float(candidate["x"]), rel_tol=1e-9, abs_tol=1e-9)
            and math.isclose(float(existing["moment"]), float(candidate["moment"]), rel_tol=1e-9, abs_tol=1e-9)
            for existing in dangerous
        ):
            continue
        dangerous.append(candidate)
        if len(dangerous) >= 5:
            break
    restraints = sum(sum(node.restraints_3d) for node in project.nodes)
    freedom = 6 * len(project.nodes) - 6 * len(project.elements) - restraints
    classification = "unstable" if freedom > 0 else ("determinate" if freedom == 0 else "indeterminate")
    totals = {label: 0.0 for label in ("fx", "fy", "fz", "mx", "my", "mz")}
    for values in reactions.values():
        for label in totals:
            totals[label] += values.get(label, 0.0)
    return {
        "analysis_dimension": 3,
        "backend": "frame3d",
        "max_translation": max_translation,
        "max_rotation": max_rotation,
        "dangerous_sections": dangerous,
        "zero_force_elements": _zero_force_elements_3d(end_forces, diagrams, force_tolerances),
        "load_point_flexibility": [],
        "reaction_totals": totals,
        "system": {
            "degrees_of_freedom": freedom,
            "indeterminacy": max(0, -freedom),
            "joints": len(project.nodes),
            "members": len(project.elements),
            "restraints": restraints,
            "classification": classification,
        },
    }
