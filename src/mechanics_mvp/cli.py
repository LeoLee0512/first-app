"""Command-line entry point for the mechanics MVP."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .engine import solve_with_backend
from .project_io import load_project
from .report import build_report_pdf


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Solve a mechanics MVP JSON project.")
    parser.add_argument("project", type=Path, help="Path to a JSON project file.")
    parser.add_argument("--indent", type=int, default=2, help="JSON output indentation.")
    parser.add_argument("--solver", default=None, help="Solver backend: frame2d, frame3d or pinn.")
    parser.add_argument("--report", type=Path, help="Optional PDF calculation report path.")
    args = parser.parse_args(argv)

    project = load_project(args.project, args.solver)
    result = solve_with_backend(project, args.solver or project.metadata.get("solver", "frame2d"))
    if args.report:
        args.report.write_bytes(build_report_pdf(project, result))
    print(
        json.dumps(
            {
                "displacements": result.displacements,
                "reactions": result.reactions,
                "element_end_forces": result.element_end_forces,
                "element_diagrams": result.element_diagrams,
                "summary": result.summary,
            },
            indent=args.indent,
            sort_keys=True,
        )
    )
    return 0
