"""JSON project serialization boundary."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from .models import (
    SPATIAL_DOFS,
    Element,
    ElementLoad,
    Material,
    NodalLoad,
    Node,
    NodeCoupling,
    Project,
    Section,
)
from .preprocess import ValidationError, validate_project
from .units import to_si


_RESTRAINT_NAME_SPLIT = re.compile(r"[,\s，、]+")


def load_project(path: str | Path) -> Project:
    with Path(path).open("r", encoding="utf-8") as file:
        raw = json.load(file)
    project = project_from_dict(raw)
    validate_project(project)
    return project


def project_from_dict(raw: dict[str, Any]) -> Project:
    materials = tuple(_parse_material(item) for item in _optional_list(raw, "materials"))
    sections = tuple(_parse_section(item) for item in _optional_list(raw, "sections"))
    nodes = tuple(_parse_node(item) for item in _optional_list(raw, "nodes"))
    elements = tuple(_parse_element(item) for item in _optional_list(raw, "elements"))
    couplings = tuple(_parse_coupling(item) for item in _optional_list(raw, "couplings"))

    raw_loads = _optional_mapping(raw, "loads")
    nodal_loads = tuple(_parse_nodal_load(item) for item in _optional_list(raw_loads, "nodes"))
    element_loads = tuple(_parse_element_load(item) for item in _optional_list(raw_loads, "elements"))

    metadata = {str(key): str(value) for key, value in _optional_mapping(raw, "metadata").items()}
    return Project(
        nodes=nodes,
        materials=materials,
        sections=sections,
        elements=elements,
        nodal_loads=nodal_loads,
        element_loads=element_loads,
        metadata=metadata,
        couplings=couplings,
    )


def _parse_coupling(raw: dict[str, Any]) -> NodeCoupling:
    return NodeCoupling(
        node_i=str(raw["node_i"]),
        node_j=str(raw["node_j"]),
        dofs=tuple(str(dof) for dof in _optional_list(raw, "dofs") or ("ux", "uy")),
    )


def _parse_node(raw: dict[str, Any]) -> Node:
    return Node(
        id=str(raw["id"]),
        x=to_si(raw["x"], default_unit="m"),
        y=to_si(raw.get("y", 0.0), default_unit="m"),
        restraints=_parse_restraints(raw.get("restraints", ())),
        support_angle=float(raw.get("support_angle", 0.0) or 0.0),
        z=to_si(raw.get("z", 0.0), default_unit="m"),
        restraints_3d=_parse_restraints_3d(raw.get("restraints_3d", raw.get("restraints", ()))),
    )


def _parse_material(raw: dict[str, Any]) -> Material:
    return Material(
        id=str(raw["id"]),
        elastic_modulus=to_si(raw["E"], default_unit="Pa"),
        poisson_ratio=float(raw.get("nu", 0.3)),
    )


def _parse_section(raw: dict[str, Any]) -> Section:
    section_modulus = raw.get("W")
    return Section(
        id=str(raw["id"]),
        area=to_si(raw["A"], default_unit="m^2"),
        inertia=to_si(raw["I"], default_unit="m^4"),
        section_modulus=None if section_modulus is None else to_si(section_modulus, default_unit="m^3"),
        inertia_y=_optional_si(raw, "Iy", "m^4"),
        inertia_z=_optional_si(raw, "Iz", "m^4"),
        torsion_constant=_optional_si(raw, "J", "m^4"),
    )


def _parse_element(raw: dict[str, Any]) -> Element:
    return Element(
        id=str(raw["id"]),
        node_i=str(raw["node_i"]),
        node_j=str(raw["node_j"]),
        material=str(raw["material"]),
        section=str(raw["section"]),
        type=str(raw.get("type", "frame")),
        moment_release_i=bool(raw.get("moment_release_i", False)),
        moment_release_j=bool(raw.get("moment_release_j", False)),
    )


def _parse_nodal_load(raw: dict[str, Any]) -> NodalLoad:
    return NodalLoad(
        node=str(raw["node"]),
        fx=to_si(raw.get("fx", 0.0), default_unit="N"),
        fy=to_si(raw.get("fy", 0.0), default_unit="N"),
        mz=to_si(raw.get("mz", 0.0), default_unit="N*m"),
        fz=to_si(raw.get("fz", 0.0), default_unit="N"),
        mx=to_si(raw.get("mx", 0.0), default_unit="N*m"),
        my=to_si(raw.get("my", 0.0), default_unit="N*m"),
    )


def _parse_element_load(raw: dict[str, Any]) -> ElementLoad:
    kind = str(raw.get("kind", "uniform_local"))
    # A distributed couple carries an intensity (N*m per metre of element);
    # every other kind uses mz as a concentrated couple.
    moment_unit = "N*m/m" if kind == "uniform_moment_local" else "N*m"
    force_unit = "N/m" if kind == "uniform_global" else "N"
    return ElementLoad(
        element=str(raw["element"]),
        kind=kind,
        ratio=None if raw.get("ratio") is None else float(raw["ratio"]),
        fx=to_si(raw.get("fx", 0.0), default_unit=force_unit),
        fy=to_si(raw.get("fy", 0.0), default_unit=force_unit),
        mz=to_si(raw.get("mz", 0.0), default_unit=moment_unit),
        qx=to_si(raw.get("qx", 0.0), default_unit="N/m"),
        qy=to_si(raw.get("qy", 0.0), default_unit="N/m"),
        qx_i=_optional_si(raw, "qx_i", "N/m"),
        qx_j=_optional_si(raw, "qx_j", "N/m"),
        qy_i=_optional_si(raw, "qy_i", "N/m"),
        qy_j=_optional_si(raw, "qy_j", "N/m"),
        qx_coefficients=_parse_coefficients(_optional_list(raw, "qx_coefficients"), "N/m"),
        qy_coefficients=_parse_coefficients(_optional_list(raw, "qy_coefficients"), "N/m"),
        fz=to_si(raw.get("fz", 0.0), default_unit=force_unit),
    )


def _parse_restraints(raw: Any) -> tuple[bool, bool, bool]:
    # Spatial names (uz/rx/ry) are accepted vocabulary — they also feed the
    # 3D parser — but only ux/uy/rz mean anything to the 2D solver.
    names = _restraint_names(raw, SPATIAL_DOFS)
    return ("ux" in names, "uy" in names, "rz" in names)


def _parse_restraints_3d(raw: Any) -> tuple[bool, ...]:
    names = _restraint_names(raw, SPATIAL_DOFS)
    return tuple(dof in names for dof in SPATIAL_DOFS)


def _restraint_names(raw: Any, allowed: tuple[str, ...]) -> set[str]:
    """Parse restraints given as a name list, a name map, or a separated string.

    Unknown DOF names raise instead of being dropped, so a typo can never
    silently delete a support (e.g. a roller written as `"uy"` used to
    resolve to no restraint at all).
    """

    if raw is None:
        return set()
    if isinstance(raw, str):
        names = {part for part in _RESTRAINT_NAME_SPLIT.split(raw.strip()) if part}
    elif isinstance(raw, dict):
        names = {str(key) for key in raw}
    elif isinstance(raw, (list, tuple)):
        names = {str(item) for item in raw}
    else:
        raise ValidationError("约束(restraints)必须是数组、对象或以逗号分隔的字符串。")
    unknown = names.difference(allowed)
    if unknown:
        raise ValidationError(
            f"未知约束自由度：{', '.join(sorted(unknown))}；可用值：{', '.join(allowed)}。"
        )
    if isinstance(raw, dict):
        return {str(key) for key, value in raw.items() if value}
    return names


def _optional_list(raw: dict[str, Any], key: str) -> Any:
    value = raw.get(key)
    if value is None:
        return ()
    if not isinstance(value, (list, tuple)):
        raise ValidationError(f"字段 {key!r} 必须是数组。")
    return value


def _optional_mapping(raw: dict[str, Any], key: str) -> dict[str, Any]:
    value = raw.get(key)
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValidationError(f"字段 {key!r} 必须是 JSON 对象。")
    return value


def _optional_si(raw: dict[str, Any], key: str, default_unit: str) -> float | None:
    if key not in raw:
        return None
    return to_si(raw[key], default_unit=default_unit)


def _parse_coefficients(raw: Any, default_unit: str) -> tuple[float, ...]:
    return tuple(to_si(item, default_unit=default_unit) for item in raw)
