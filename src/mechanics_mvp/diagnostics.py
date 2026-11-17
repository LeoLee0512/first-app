"""Topology-level model diagnostics for mechanics projects."""

from __future__ import annotations

import math
from dataclasses import dataclass, field

from .models import Project


@dataclass(frozen=True)
class DiagnosticIssue:
    level: str
    code: str
    message: str


@dataclass(frozen=True)
class ModelDiagnostics:
    node_count: int
    element_count: int
    restrained_dof_count: int
    total_dof_count: int
    free_dof_count: int
    determinacy_index: int
    connected_components: list[list[str]]
    # True when s = r + 3m - 3j ignores truss hinges or moment releases.
    index_ignores_hinges: bool = False
    issues: list[DiagnosticIssue] = field(default_factory=list)


def diagnose_project(project: Project) -> ModelDiagnostics:
    issues: list[DiagnosticIssue] = []

    node_ids = [node.id for node in project.nodes]
    duplicate_nodes = sorted({node_id for node_id in node_ids if node_ids.count(node_id) > 1})
    for node_id in duplicate_nodes:
        issues.append(
            DiagnosticIssue(
                level="error",
                code="duplicate_node_id",
                message=f"Duplicate node id found: {node_id}",
            )
        )

    nodes = {node.id: node for node in project.nodes}

    for element in project.elements:
        if element.node_i not in nodes:
            issues.append(
                DiagnosticIssue(
                    level="error",
                    code="missing_node_i",
                    message=f"Element {element.id} references missing node_i {element.node_i}.",
                )
            )
            continue

        if element.node_j not in nodes:
            issues.append(
                DiagnosticIssue(
                    level="error",
                    code="missing_node_j",
                    message=f"Element {element.id} references missing node_j {element.node_j}.",
                )
            )
            continue

        node_i = nodes[element.node_i]
        node_j = nodes[element.node_j]
        length = math.hypot(node_j.x - node_i.x, node_j.y - node_i.y)

        if length <= 0.0:
            issues.append(
                DiagnosticIssue(
                    level="error",
                    code="zero_length_element",
                    message=f"Element {element.id} has zero length.",
                )
            )

    connected_components = _connected_components(project)

    if len(connected_components) > 1:
        issues.append(
            DiagnosticIssue(
                level="warning",
                code="disconnected_structure",
                message=f"Model has {len(connected_components)} disconnected components.",
            )
        )

    referenced_nodes = {element.node_i for element in project.elements} | {
        element.node_j for element in project.elements
    }
    isolated_nodes = sorted(set(node_ids) - referenced_nodes)

    for node_id in isolated_nodes:
        issues.append(
            DiagnosticIssue(
                level="warning",
                code="isolated_node",
                message=f"Node {node_id} is not connected to any element.",
            )
        )

    restrained_dof_count = sum(
        1
        for node in project.nodes
        for restrained in node.restraints
        if restrained
    )

    total_dof_count = 3 * len(project.nodes)
    free_dof_count = total_dof_count - restrained_dof_count

    # Plane-frame rough determinacy estimate: s = r + 3m - 3j.
    # This is topological screening, not a stiffness-rank stability proof.
    # It does not see truss hinges or moment releases, so it must not be
    # reported as the same judgement as classify_system when those exist.
    coupled_dof_count = sum(len(coupling.dofs) for coupling in project.couplings)
    determinacy_index = restrained_dof_count + coupled_dof_count + 3 * len(project.elements) - 3 * len(project.nodes)
    index_ignores_hinges = any(
        element.type == "truss" or element.moment_release_i or element.moment_release_j
        for element in project.elements
    )

    if index_ignores_hinges:
        issues.append(
            DiagnosticIssue(
                level="info",
                code="index_ignores_hinges",
                message=(
                    "The rigid-frame count s = r + 3m - 3j ignores truss hinges and "
                    "moment releases. It is not the determinacy judgement."
                ),
            )
        )
    elif determinacy_index < 0:
        issues.append(
            DiagnosticIssue(
                level="warning",
                code="likely_mechanism",
                message=(
                    "The rough determinacy index is negative. "
                    "The model may be unstable or under-restrained."
                ),
            )
        )
    elif determinacy_index == 0:
        issues.append(
            DiagnosticIssue(
                level="info",
                code="roughly_determinate",
                message="The rough determinacy index is zero. The model may be statically determinate.",
            )
        )
    else:
        issues.append(
            DiagnosticIssue(
                level="info",
                code="roughly_indeterminate",
                message=(
                    f"The rough determinacy index is {determinacy_index}. "
                    "The model may be statically indeterminate."
                ),
            )
        )

    return ModelDiagnostics(
        node_count=len(project.nodes),
        element_count=len(project.elements),
        restrained_dof_count=restrained_dof_count,
        total_dof_count=total_dof_count,
        free_dof_count=free_dof_count,
        determinacy_index=determinacy_index,
        connected_components=connected_components,
        index_ignores_hinges=index_ignores_hinges,
        issues=issues,
    )


def _connected_components(project: Project) -> list[list[str]]:
    adjacency: dict[str, set[str]] = {node.id: set() for node in project.nodes}

    for element in project.elements:
        if element.node_i in adjacency and element.node_j in adjacency:
            adjacency[element.node_i].add(element.node_j)
            adjacency[element.node_j].add(element.node_i)

    visited: set[str] = set()
    components: list[list[str]] = []

    for node_id in adjacency:
        if node_id in visited:
            continue

        stack = [node_id]
        component: list[str] = []
        visited.add(node_id)

        while stack:
            current = stack.pop()
            component.append(current)

            for neighbor in adjacency[current]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    stack.append(neighbor)

        components.append(sorted(component))

    return components
