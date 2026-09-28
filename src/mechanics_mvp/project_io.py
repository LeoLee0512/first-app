"""JSON project serialization boundary."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .models import Element, ElementLoad, Material, NodalLoad, Node, Project, Section
from .preprocess import validate_project
from .units import to_si


def load_project(path: str | Path) -> Project:
    with Path(path).open("r", encoding="utf-8") as file:
        raw = json.load(file)
    project = project_from_dict(raw)
    validate_project(project)
    return project


def project_from_dict(raw: dict[str, Any]) -> Project:
    materials = tuple(_parse_material(item) for item in raw.get("materials", ()))
    sections = tuple(_parse_section(item) for item in raw.get("sections", ()))
    nodes = tuple(_parse_node(item) for item in raw.get("nodes", ()))
    elements = tuple(_parse_element(item) for item in raw.get("elements", ()))

    raw_loads = raw.get("loads", {})
    nodal_loads = tuple(_parse_nodal_load(item) for item in raw_loads.get("nodes", ()))
    element_loads = tuple(_parse_element_load(item) for item in raw_loads.get("elements", ()))

    metadata = {str(key): str(value) for key, value in raw.get("metadata", {}).items()}
    return Project(
        nodes=nodes,
        materials=materials,
        sections=sections,
        elements=elements,
        nodal_loads=nodal_loads,
        element_loads=element_loads,
        metadata=metadata,
    )


def _parse_node(raw: dict[str, Any]) -> Node:
    return Node(
        id=str(raw["id"]),
        x=to_si(raw["x"], default_unit="m"),
        y=to_si(raw.get("y", 0.0), default_unit="m"),
        restraints=_parse_restraints(raw.get("restraints", ())),
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
    )


def _parse_element_load(raw: dict[str, Any]) -> ElementLoad:
    kind = str(raw.get("kind", "uniform_local"))
    # A distributed couple carries an intensity (N*m per metre of element);
    # every other kind uses mz as a concentrated couple.
    moment_unit = "N*m/m" if kind == "uniform_moment_local" else "N*m"
    return ElementLoad(
        element=str(raw["element"]),
        kind=kind,
        ratio=None if raw.get("ratio") is None else float(raw["ratio"]),
        fx=to_si(raw.get("fx", 0.0), default_unit="N"),
        fy=to_si(raw.get("fy", 0.0), default_unit="N"),
        mz=to_si(raw.get("mz", 0.0), default_unit=moment_unit),
        qx=to_si(raw.get("qx", 0.0), default_unit="N/m"),
        qy=to_si(raw.get("qy", 0.0), default_unit="N/m"),
        qx_i=_optional_si(raw, "qx_i", "N/m"),
        qx_j=_optional_si(raw, "qx_j", "N/m"),
        qy_i=_optional_si(raw, "qy_i", "N/m"),
        qy_j=_optional_si(raw, "qy_j", "N/m"),
        qx_coefficients=_parse_coefficients(raw.get("qx_coefficients", ()), "N/m"),
        qy_coefficients=_parse_coefficients(raw.get("qy_coefficients", ()), "N/m"),
    )


def _parse_restraints(raw: Any) -> tuple[bool, bool, bool]:
    if isinstance(raw, dict):
        return (
            bool(raw.get("ux", False)),
            bool(raw.get("uy", False)),
            bool(raw.get("rz", False)),
        )

    names = {str(item) for item in raw}
    return ("ux" in names, "uy" in names, "rz" in names)


def _optional_si(raw: dict[str, Any], key: str, default_unit: str) -> float | None:
    if key not in raw:
        return None
    return to_si(raw[key], default_unit=default_unit)


def _parse_coefficients(raw: Any, default_unit: str) -> tuple[float, ...]:
    return tuple(to_si(item, default_unit=default_unit) for item in raw)
