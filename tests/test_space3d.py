import math
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.engine import solve_with_backend
from mechanics_mvp.models import Element, ElementLoad, Material, NodalLoad, Node, Project, Section
from mechanics_mvp.project_io import project_from_dict

MATERIALS = (Material("m", 200e9, 0.3),)
SECTIONS = (Section("s", 0.01, 8e-5, inertia_y=8e-5, inertia_z=8e-5, torsion_constant=16e-5),)


class Space3DTests(unittest.TestCase):
    def test_spatial_bent_frame_transfers_bending_and_torsion(self):
        a, b, q = 3.0, 2.0, 4_000.0
        couple = q * b**2 / 3
        project = Project(
            nodes=(
                Node("A", 0.0, 0.0, restraints_3d=(True,) * 6),
                Node("B", a, 0.0),
                Node("C", a, b),
            ),
            materials=MATERIALS,
            sections=SECTIONS,
            elements=(Element("AB", "A", "B", "m", "s"), Element("BC", "B", "C", "m", "s")),
            nodal_loads=(NodalLoad("C", mx=couple),),
            element_loads=(ElementLoad("AB", "uniform_global", fz=-q),),
        )

        result = solve_with_backend(project, "frame3d")

        self.assertAlmostEqual(result.reactions["A"]["fz"], q * a)
        self.assertAlmostEqual(result.reactions["A"]["mx"], -couple)
        self.assertAlmostEqual(result.reactions["A"]["my"], -q * a**2 / 2)
        ab = result.element_diagrams["AB"]
        self.assertAlmostEqual(ab[0]["vz"], q * a)
        self.assertAlmostEqual(ab[0]["my"], q * a**2 / 2)
        self.assertAlmostEqual(ab[0]["t"], couple)
        self.assertAlmostEqual(ab[-1]["vz"], 0.0, places=7)
        self.assertAlmostEqual(ab[-1]["my"], 0.0, places=7)
        self.assertAlmostEqual(ab[-1]["t"], couple)
        for row in result.element_diagrams["BC"]:
            self.assertAlmostEqual(abs(row["my"]), couple)
            self.assertAlmostEqual(row["t"], 0.0, places=7)
            self.assertAlmostEqual(row["vz"], 0.0, places=7)

    def test_cut_ring_matches_book_force_moment_and_torsion(self):
        radius, force, count = 2.0, 1_000.0, 96
        nodes = []
        for index in range(count + 1):
            theta = 2 * math.pi * index / count
            nodes.append(
                Node(
                    f"N{index}",
                    radius * math.cos(theta),
                    radius * math.sin(theta),
                    restraints_3d=(True,) * 6 if index == 0 else (False,) * 6,
                )
            )
        elements = [Element(f"E{index}", f"N{index}", f"N{index + 1}", "m", "s") for index in range(count)]
        project = Project(
            nodes=tuple(nodes),
            materials=MATERIALS,
            sections=SECTIONS,
            elements=tuple(elements),
            nodal_loads=(NodalLoad(f"N{count}", fz=-force),),
        )

        result = solve_with_backend(project, "frame3d")

        self.assertAlmostEqual(result.reactions["N0"]["fz"], force, places=5)
        for index in (count // 4, count // 2, 3 * count // 4):
            theta = 2 * math.pi * index / count
            row = result.element_diagrams[f"E{index}"][0]
            element = elements[index]
            ni, nj = nodes[index], nodes[index + 1]
            axis_x = np.array([nj.x - ni.x, nj.y - ni.y, nj.z - ni.z], dtype=float)
            axis_x /= np.linalg.norm(axis_x)
            axis_y = np.cross(np.array([0.0, 0.0, 1.0]), axis_x)
            axis_y /= np.linalg.norm(axis_y)
            axis_z = np.cross(axis_x, axis_y)
            rotation = np.vstack((axis_x, axis_y, axis_z))
            moment_global = rotation.T @ np.array([row["t"], row["my"], row["mz"]])
            radial = np.array([math.cos(theta), math.sin(theta), 0.0])
            tangent = np.array([-math.sin(theta), math.cos(theta), 0.0])
            self.assertAlmostEqual(float(moment_global @ radial), force * radius * math.sin(theta), delta=40.0)
            self.assertAlmostEqual(float(moment_global @ tangent), -force * radius * (1 - math.cos(theta)), delta=40.0)
            self.assertTrue(math.isclose(abs(row["vz"]), force, rel_tol=1e-8))

    def test_spatial_json_fields_are_parsed(self):
        project = project_from_dict(
            {
                "materials": [{"id": "m", "E": "200 GPa", "nu": 0.3}],
                "sections": [{"id": "s", "A": "10000 mm^2", "I": "80000000 mm^4", "J": "160000000 mm^4"}],
                "nodes": [
                    {"id": "A", "x": "0 m", "z": "1 m", "restraints": ["ux", "uy", "uz", "rx", "ry", "rz"]},
                    {"id": "B", "x": "2 m"},
                ],
                "elements": [{"id": "E", "node_i": "A", "node_j": "B", "material": "m", "section": "s"}],
                "loads": {
                    "nodes": [{"node": "B", "fz": "2 kN", "mx": "3 kN*m"}],
                    "elements": [{"element": "E", "kind": "uniform_global", "fz": "-4 kN/m"}],
                },
            }
        )

        self.assertEqual(project.nodes[0].z, 1.0)
        self.assertEqual(project.nodes[0].restraints_3d, (True,) * 6)
        self.assertAlmostEqual(project.sections[0].torsion_constant, 0.00016)
        self.assertEqual(project.nodal_loads[0].fz, 2_000.0)
        self.assertEqual(project.nodal_loads[0].mx, 3_000.0)
        self.assertEqual(project.element_loads[0].fz, -4_000.0)

    def test_spatial_api_and_report_keep_six_components(self):
        from mechanics_mvp.report import build_report_text
        from mechanics_mvp.webapp import solve_project_payload

        raw = {
            "metadata": {"solver": "frame3d"},
            "materials": [{"id": "m", "E": "200 GPa", "nu": 0.3}],
            "sections": [{"id": "s", "A": "10000 mm^2", "I": "80000000 mm^4", "J": "160000000 mm^4"}],
            "nodes": [
                {"id": "A", "x": "0 m", "restraints": ["ux", "uy", "uz", "rx", "ry", "rz"]},
                {"id": "B", "x": "2 m"},
            ],
            "elements": [{"id": "E", "node_i": "A", "node_j": "B", "material": "m", "section": "s"}],
            "loads": {
                "nodes": [{"node": "B", "fz": "-2 kN", "mx": "3 kN*m"}],
                "elements": [{"element": "E", "kind": "uniform_global", "fz": "-4 kN/m"}],
            },
        }

        result = solve_project_payload(raw)
        self.assertEqual(result["summary"]["analysis_dimension"], 3)
        self.assertAlmostEqual(result["reactions"]["A"]["fz"], 10_000.0)
        self.assertAlmostEqual(result["reactions"]["A"]["mx"], -3_000.0)
        text = build_report_text(project_from_dict(raw), solve_with_backend(project_from_dict(raw), "frame3d"))
        self.assertIn("三维线弹性空间梁柱矩阵位移法", text)
        self.assertIn("Fz=10 kN", text)
        self.assertIn("Mx=-3 kN·m", text)
        self.assertIn("扭矩 T", text)
        self.assertIn("三维组合应力/应变尚未提供", text)


if __name__ == "__main__":
    unittest.main()
