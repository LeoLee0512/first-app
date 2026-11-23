"""Regression tests for mechanics, parsing, solver, CLI, and report audit items (F01-F22, S01-S02)."""

from __future__ import annotations

import io
import json
import math
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.cli import main as cli_main
from mechanics_mvp.engine import solve_with_backend
from mechanics_mvp.models import Element, Material, NodalLoad, Node, NodeCoupling, Project, Section
from mechanics_mvp.preprocess import MAX_SOLVE_DOFS, ValidationError
from mechanics_mvp.project_io import load_project, project_from_dict
from mechanics_mvp.report import build_report_text
from mechanics_mvp.units import to_si
from mechanics_mvp.webapp import dynamics_report_payload, solve_project_payload


EXAMPLES = Path(__file__).resolve().parents[1] / "examples"


def beam() -> dict:
    return json.loads((EXAMPLES / "cantilever_beam.json").read_text(encoding="utf-8"))


class MechanicsAuditTests(unittest.TestCase):
    def test_f01_editable_support_matches_solve_payload_and_handles_null_and_conflict(self) -> None:
        raw = beam()
        raw["nodes"][1].update(restraints=["uy"], support={"angle": 90})
        editable = solve_project_payload(raw)
        raw["nodes"][1]["support_angle"] = 90
        self.assertEqual(editable, solve_project_payload(raw))
        self.assertAlmostEqual(editable["reactions"]["A"]["fy"], 10_000.0)
        self.assertAlmostEqual(editable["reactions"]["A"]["mz"], 20_000.0)
        self.assertAlmostEqual(editable["reactions"]["B"]["fy"], 0.0, places=7)

        # Explicit null support_angle falls back cleanly to support.angle
        raw["nodes"][1]["support_angle"] = None
        self.assertEqual(editable, solve_project_payload(raw))

        # Boolean support_angle is rejected
        raw["nodes"][1]["support_angle"] = True
        with self.assertRaises(ValidationError):
            solve_project_payload(raw)

        # Conflicting angles raise
        raw["nodes"][1]["support_angle"] = 0
        with self.assertRaisesRegex(ValidationError, "Conflicting"):
            solve_project_payload(raw)

    def test_f02_curved_geometry_rejected_while_tee_and_null_allowed(self) -> None:
        for bad_geometry in ("arc", "right_angle", "freeform", 123):
            raw = beam()
            raw["elements"][0].update(type="frame", geometry=bad_geometry)
            with self.subTest(geometry=bad_geometry):
                with self.assertRaisesRegex(ValidationError, "discretised"):
                    solve_project_payload(raw)

        for ok_geometry in ("straight", "tee", None):
            raw = beam()
            raw["elements"][0].update(type="frame", geometry=ok_geometry)
            with self.subTest(geometry=ok_geometry):
                result = solve_project_payload(raw)
                self.assertAlmostEqual(result["reactions"]["A"]["fy"], 10_000.0)

    def test_f03_f11_f12_coupled_steel_cantilevers_and_redundant_coupling(self) -> None:
        raw = beam()
        raw["nodes"] = [
            {"id": "A", "x": 0, "restraints": "ux uy rz"},
            {"id": "B", "x": 1},
            {"id": "C", "x": 1},
            {"id": "D", "x": 2, "restraints": "ux uy rz"},
        ]
        raw["elements"].append(dict(raw["elements"][0], id="E2", node_i="C", node_j="D"))
        raw["couplings"] = [
            {"node_i": "B", "node_j": "C"},
            {"node_i": "A", "node_j": "D", "dofs": ["uy"]},
        ]
        raw["loads"] = {"nodes": [{"node": "B", "fy": -1000}]}
        result = solve_project_payload(raw)
        self.assertAlmostEqual(result["reactions"]["A"]["fy"], 500.0)
        self.assertAlmostEqual(result["reactions"]["D"]["fy"], 500.0)
        self.assertEqual(len(result["summary"]["diagnostics"]["connected_components"]), 1)
        self.assertEqual(result["summary"]["system"]["coupled_dofs"], 2)

        # Single fixed-fixed beam with redundant coupling on restrained DOFs
        fixed = beam()
        fixed["nodes"][1]["restraints"] = ["ux", "uy", "rz"]
        fixed["couplings"] = [{"node_i": "A", "node_j": "B", "dofs": ["uy"]}]
        fixed_result = solve_project_payload(fixed)
        self.assertEqual(fixed_result["summary"]["system"]["coupled_dofs"], 0)
        self.assertEqual(fixed_result["summary"]["system"]["classification"], "indeterminate")

    def test_f04_section_modulus_controls_stress_strain_and_report_marks_assumption(self) -> None:
        raw = beam()
        raw["sections"][0]["W"] = "0.0004 m^3"
        raw["loads"] = {"nodes": [{"node": "B", "mz": 16_000}]}
        project = project_from_dict(raw)
        report = build_report_text(project, solve_with_backend(project))
        self.assertIn("40 MPa", report)
        self.assertIn("200 με", report)
        self.assertIn("输入截面模量 W", report)

        del raw["sections"][0]["W"]
        project_no_w = project_from_dict(raw)
        report_no_w = build_report_text(project_no_w, solve_with_backend(project_no_w))
        self.assertIn("等效正方形截面假设", report_no_w)

    def test_f05_f15_f16_f17_f19_normalized_input_and_validation(self) -> None:
        raw = beam()
        raw.update(metadata=None)
        raw["sections"][0].update(A="10000 mm²", I="80000000 mm⁴")
        raw["materials"][0]["E"] = "200000 N/mm^2"
        raw["elements"][0]["moment_release_j"] = "false"
        raw["nodes"][0]["restraints"] = {"ux": True, "uy": True, "rz": "true"}
        raw["nodes"][1]["restraints"] = {"rz": "false"}
        raw["loads"] = {"nodes": [{"node": "B", "mz": "2 kN·m"}]}
        self.assertAlmostEqual(solve_project_payload(raw)["reactions"]["A"]["mz"], -2000.0)

        # F05: out-of-plane nodal load rejected with field name and frame3d hint
        raw["loads"]["nodes"][0]["fz"] = -1000
        with self.assertRaisesRegex(ValidationError, r"fz.*frame3d"):
            solve_project_payload(raw)

        # F17: explicit empty coupling dofs rejected, while omitted/null defaults
        del raw["loads"]["nodes"][0]["fz"]
        raw["couplings"] = [{"node_i": "A", "node_j": "B", "dofs": []}]
        with self.assertRaises(ValidationError):
            solve_project_payload(raw)

    def test_f06_f20_f21_spatial_inclined_support_section_fallback_and_missing_element(self) -> None:
        raw = json.loads((EXAMPLES / "spatial_bent_frame.json").read_text(encoding="utf-8"))
        del raw["sections"][0]["I"]
        raw["nodes"][1].update(restraints_3d=["uy"], support_angle=90)
        raw["loads"] = {"nodes": [{"node": "B", "fy": -1000}]}
        result = solve_project_payload(raw)
        self.assertAlmostEqual(result["reactions"]["A"]["fy"], 1000.0)
        self.assertAlmostEqual(result["reactions"]["B"]["fy"], 0.0, places=7)

        # Explicit null I with Iy/Iz/J also works
        raw["sections"][0]["I"] = None
        self.assertAlmostEqual(solve_project_payload(raw)["reactions"]["A"]["fy"], 1000.0)

        # 3D inclined rotational restraint (rx rotated by 90 deg -> global ry)
        rot_raw = json.loads((EXAMPLES / "spatial_bent_frame.json").read_text(encoding="utf-8"))
        rot_raw["nodes"][1].update(restraints_3d=["rx"], support_angle=90)
        rot_raw["loads"] = {"nodes": [{"node": "B", "my": 1000}]}
        rot_result = solve_project_payload(rot_raw)
        self.assertAlmostEqual(rot_result["displacements"]["B"]["ry"], 0.0, places=9)
        self.assertIn("my", rot_result["reactions"]["B"])

        # F21: missing element referenced by 3D element load gives named error
        raw["loads"] = {"elements": [{"element": "removed", "kind": "uniform_global", "fz": -1000}]}
        with self.assertRaisesRegex(ValidationError, "removed"):
            solve_project_payload(raw)

    def test_f08_high_degree_polynomial_equilibrium(self) -> None:
        raw = beam()
        raw["nodes"][1]["x"] = 1
        raw["loads"] = {
            "elements": [
                {"element": "E1", "kind": "polynomial_local", "qy_coefficients": [0] * 40 + [-41000]}
            ]
        }
        reaction = solve_project_payload(raw)["reactions"]["A"]
        self.assertAlmostEqual(reaction["fy"], 1000.0)
        self.assertAlmostEqual(reaction["mz"], 41000.0 / 42.0)

    def test_f09_triangular_peak_and_point_load_deduplication(self) -> None:
        raw = beam()
        raw["nodes"][0]["restraints"] = ["ux", "uy"]
        raw["nodes"][1]["restraints"] = ["uy"]
        raw["loads"] = {"elements": [{"element": "E1", "kind": "linear_local", "qy_i": 0, "qy_j": -12000}]}
        peak = solve_project_payload(raw)["summary"]["dangerous_sections"][0]
        self.assertAlmostEqual(peak["x"], 2.0 / math.sqrt(3.0))
        self.assertAlmostEqual(peak["moment"], 16000.0 / (3.0 * math.sqrt(3.0)))

        # Midspan point force without moment jump should not duplicate peak in dangerous_sections
        raw["loads"] = {"elements": [{"element": "E1", "kind": "point_global", "ratio": 0.5, "fy": -10000}]}
        dangerous = solve_project_payload(raw)["summary"]["dangerous_sections"]
        self.assertAlmostEqual(dangerous[0]["x"], 1.0)
        self.assertFalse(
            len(dangerous) > 1
            and math.isclose(dangerous[0]["x"], dangerous[1]["x"], abs_tol=1e-6)
            and math.isclose(dangerous[0]["moment"], dangerous[1]["moment"], abs_tol=1e-6)
        )

    def test_f10_f13_f14_flexibility_zero_force_and_zero_response(self) -> None:
        raw = beam()
        raw["loads"] = {"nodes": [{"node": "B", "fy": -3000}]}
        combined = solve_project_payload(raw)["summary"]["load_point_flexibility"]
        raw["loads"] = {"nodes": [{"node": "B", "fy": -1000}, {"node": "B", "fy": -2000}]}
        self.assertEqual(solve_project_payload(raw)["summary"]["load_point_flexibility"], combined)

        # Cancelling loads with floating-point residue produce no bogus flexibility
        raw["loads"] = {
            "nodes": [
                {"node": "B", "fy": 0.1},
                {"node": "B", "fy": 0.2},
                {"node": "B", "fy": -0.3},
            ]
        }
        self.assertEqual(solve_project_payload(raw)["summary"]["load_point_flexibility"], [])

        # F13: tiny force in one bar not masked by huge force in another
        p_two = Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, True)),
                Node("B", 1.0, 0.0),
                Node("C", 0.0, 2.0, (True, True, True)),
                Node("D", 1.0, 2.0),
            ),
            materials=(Material("s", 200e9),),
            sections=(Section("sec", 0.01, 8e-5),),
            elements=(
                Element("E1", "A", "B", "s", "sec"),
                Element("E2", "C", "D", "s", "sec"),
            ),
            nodal_loads=(NodalLoad("B", fx=2e8), NodalLoad("D", fx=1.0)),
        )
        self.assertEqual(solve_with_backend(p_two).summary["zero_force_elements"], [])

        # F14: zero-load model initializes max_translation / max_rotation with a real node id
        raw["loads"] = {}
        zero_summary = solve_project_payload(raw)["summary"]
        self.assertIn(zero_summary["max_translation"]["node"], {"A", "B"})
        self.assertIn(zero_summary["max_rotation"]["node"], {"A", "B"})

    def test_f15_shared_static_unit_vectors_match_frontend_conventions(self) -> None:
        vectors = (
            ("100 mm²", "m^2", 1e-4),
            ("100 mm2", "m^2", 1e-4),
            ("25 cm³", "m^3", 25e-6),
            ("80000000 mm⁴", "m^4", 8e-5),
            ("20 kN·m", "N*m", 20_000.0),
            ("20 kN⋅m", "N*m", 20_000.0),
            ("3 MN*m", "N*m", 3_000_000.0),
            ("200000 N/mm^2", "Pa", 200e9),
            ("200000 N/mm²", "Pa", 200e9),
            ("5 kN·m/m", "N*m/m", 5_000.0),
            ("12 N/mm", "N/m", 12_000.0),
        )
        for text, default_unit, expected in vectors:
            with self.subTest(text=text):
                self.assertAlmostEqual(to_si(text, default_unit=default_unit), expected)

    def test_f18_cli_respects_project_metadata_solver(self) -> None:
        spatial_path = EXAMPLES / "spatial_bent_frame.json"
        loaded = load_project(spatial_path)
        self.assertEqual(loaded.metadata.get("solver"), "frame3d")
        buf = io.StringIO()
        with redirect_stdout(buf):
            rc = cli_main([str(spatial_path)])
        self.assertEqual(rc, 0)
        parsed = json.loads(buf.getvalue())
        self.assertEqual(parsed["summary"]["analysis_dimension"], 3)

    def test_f22_dynamics_report_rejects_null_empty_and_non_string(self) -> None:
        for bad_text in (None, "", "   \n\t ", 123, {"a": 1}, ["x"]):
            with self.subTest(report_text=bad_text):
                with self.assertRaises(ValueError):
                    dynamics_report_payload({"report_text": bad_text})

    def test_s01_s02_size_caps_for_3d_and_couplings_run_before_diagnostics_and_allocation(self) -> None:
        # 251 spatial nodes = 1506 DOFs > 1500
        nodes_3d = tuple(
            Node(f"N{i}", float(i), 0.0, restraints_3d=(True,) * 6 if i == 0 else (False,) * 6)
            for i in range(251)
        )
        project_3d = Project(
            nodes=nodes_3d,
            materials=(Material("m", 200e9, 0.3),),
            sections=(Section("s", 0.01, 8e-5, inertia_y=8e-5, inertia_z=8e-5, torsion_constant=16e-5),),
            elements=(Element("E1", "N0", "N1", "m", "s"),),
        )
        with patch("mechanics_mvp.space3d.np.zeros") as zeros_3d:
            with self.assertRaisesRegex(ValidationError, "6N×6N"):
                solve_with_backend(project_3d, "frame3d")
        zeros_3d.assert_not_called()

        # 2D with couplings pushing total DOFs + constraints past MAX_SOLVE_DOFS
        nodes_2d = tuple(
            Node(f"N{i}", float(i), 0.0, (True, True, True) if i == 0 else (False, False, False))
            for i in range(490)
        )
        couplings = tuple(NodeCoupling(f"N{i}", f"N{i + 1}", ("ux", "uy")) for i in range(20))
        project_coupled = Project(
            nodes=nodes_2d,
            materials=(Material("m", 200e9),),
            sections=(Section("s", 0.01, 8e-5),),
            elements=(Element("E1", "N0", "N1", "m", "s"),),
            couplings=couplings,
        )
        self.assertGreater(490 * 3 + 20 * 2, MAX_SOLVE_DOFS)
        with patch("mechanics_mvp.engine.diagnose_project") as diag_mock:
            with self.assertRaisesRegex(ValidationError, "3N×3N"):
                solve_with_backend(project_coupled, "frame2d")
        diag_mock.assert_not_called()


if __name__ == "__main__":
    unittest.main()
