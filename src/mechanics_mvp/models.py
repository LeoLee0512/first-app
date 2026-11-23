"""Domain models for the mechanics MVP."""

from __future__ import annotations

from dataclasses import dataclass, field
from math import sqrt
from typing import Any


DOFS = ("ux", "uy", "rz")
SPATIAL_DOFS = ("ux", "uy", "uz", "rx", "ry", "rz")


@dataclass(frozen=True)
class Node:
    id: str
    x: float
    y: float
    restraints: tuple[bool, bool, bool] = (False, False, False)
    # Orientation of the support in degrees, counter-clockwise positive.
    # 0 means the ground lies below the node (support local y' = global y);
    # `restraints` ux/uy are applied along the rotated support axes x'/y'.
    support_angle: float = 0.0
    z: float = 0.0
    restraints_3d: tuple[bool, ...] = (False,) * 6


@dataclass(frozen=True)
class Material:
    id: str
    elastic_modulus: float
    poisson_ratio: float = 0.3


@dataclass(frozen=True)
class Section:
    id: str
    area: float
    inertia: float
    section_modulus: float | None = None
    inertia_y: float | None = None
    inertia_z: float | None = None
    torsion_constant: float | None = None

    @property
    def plane_bending_modulus(self) -> float:
        if self.section_modulus is not None:
            return self.section_modulus
        return self.inertia / (sqrt(self.area) / 2)

    def extreme_normal_stress(self, axial: float, moment: float) -> float:
        mean = axial / self.area
        bending = moment / self.plane_bending_modulus
        return max((mean + bending, mean - bending), key=abs)


@dataclass(frozen=True)
class Element:
    id: str
    node_i: str
    node_j: str
    material: str
    section: str
    type: str = "frame"
    moment_release_i: bool = False
    moment_release_j: bool = False


@dataclass(frozen=True)
class NodalLoad:
    node: str
    fx: float = 0.0
    fy: float = 0.0
    mz: float = 0.0
    fz: float = 0.0
    mx: float = 0.0
    my: float = 0.0


@dataclass(frozen=True)
class ElementLoad:
    element: str
    kind: str
    ratio: float | None = None
    fx: float = 0.0
    fy: float = 0.0
    mz: float = 0.0
    qx: float = 0.0
    qy: float = 0.0
    qx_i: float | None = None
    qx_j: float | None = None
    qy_i: float | None = None
    qy_j: float | None = None
    qx_coefficients: tuple[float, ...] = ()
    qy_coefficients: tuple[float, ...] = ()
    fz: float = 0.0


@dataclass(frozen=True)
class NodeCoupling:
    node_i: str
    node_j: str
    dofs: tuple[str, ...] = ("ux", "uy")


@dataclass(frozen=True)
class Project:
    nodes: tuple[Node, ...]
    materials: tuple[Material, ...]
    sections: tuple[Section, ...]
    elements: tuple[Element, ...]
    nodal_loads: tuple[NodalLoad, ...] = ()
    element_loads: tuple[ElementLoad, ...] = ()
    metadata: dict[str, str] = field(default_factory=dict)
    couplings: tuple[NodeCoupling, ...] = ()


@dataclass(frozen=True)
class AnalysisResult:
    displacements: dict[str, dict[str, float]]
    reactions: dict[str, dict[str, float]]
    element_end_forces: dict[str, dict[str, float]]
    element_diagrams: dict[str, list[dict[str, float]]] = field(default_factory=dict)
    summary: dict[str, Any] = field(default_factory=dict)
