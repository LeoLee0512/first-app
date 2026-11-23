import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.models import Element, Material, NodalLoad, Node, NodeCoupling, Project, Section
from mechanics_mvp.project_io import project_from_dict
from mechanics_mvp.solver import Frame2DSolver


class NodeCouplingTests(unittest.TestCase):
    def test_opposite_moments_on_two_hinge_sides_do_not_cancel(self):
        project = Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, True)),
                Node("B", 0.0, 4.0),
                Node("HL", 4.0, 4.0),
                Node("HR", 4.0, 4.0),
                Node("C", 8.0, 4.0, (False, True, False)),
            ),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(
                Element("AB", "A", "B", "steel", "section"),
                Element("BL", "B", "HL", "steel", "section"),
                Element("RC", "HR", "C", "steel", "section"),
            ),
            nodal_loads=(NodalLoad("HL", mz=10_000.0), NodalLoad("HR", mz=-10_000.0)),
            couplings=(NodeCoupling("HL", "HR"),),
        )

        result = Frame2DSolver().solve(project)

        self.assertAlmostEqual(result.reactions["C"]["fy"], 2_500.0)
        self.assertAlmostEqual(result.reactions["A"]["fy"], -2_500.0)
        self.assertAlmostEqual(result.reactions["A"]["mz"], -20_000.0)
        for dof in ("ux", "uy"):
            self.assertAlmostEqual(result.displacements["HL"][dof], result.displacements["HR"][dof])
        self.assertNotAlmostEqual(result.displacements["HL"]["rz"], result.displacements["HR"]["rz"])
        self.assertEqual(result.summary["system"]["classification"], "determinate")

    def test_portal_hinge_accepts_independent_side_moments(self):
        project = Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, False)),
                Node("L", 0.0, 3.0),
                Node("HL", 2.0, 3.0),
                Node("HR", 2.0, 3.0),
                Node("R", 4.0, 3.0),
                Node("B", 4.0, 0.0, (True, True, False)),
            ),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(
                Element("AL", "A", "L", "steel", "section"),
                Element("LH", "L", "HL", "steel", "section"),
                Element("HR", "HR", "R", "steel", "section"),
                Element("RB", "R", "B", "steel", "section"),
            ),
            nodal_loads=(NodalLoad("HL", mz=10_000.0), NodalLoad("HR", mz=-10_000.0)),
            couplings=(NodeCoupling("HL", "HR"),),
        )

        result = Frame2DSolver().solve(project)

        self.assertEqual(result.summary["system"]["classification"], "determinate")
        self.assertGreater(max(abs(row["m"]) for rows in result.element_diagrams.values() for row in rows), 0.0)
        for dof in ("ux", "uy"):
            self.assertAlmostEqual(result.displacements["HL"][dof], result.displacements["HR"][dof])

    def test_project_io_reads_node_couplings(self):
        project = project_from_dict(
            {
                "materials": [{"id": "steel", "E": "200 GPa"}],
                "sections": [{"id": "section", "A": "10000 mm^2", "I": "80000000 mm^4"}],
                "nodes": [
                    {"id": "A", "x": "0 m", "restraints": ["ux", "uy", "rz"]},
                    {"id": "L", "x": "1 m"},
                    {"id": "R", "x": "1 m"},
                ],
                "elements": [{"id": "E", "node_i": "A", "node_j": "L", "material": "steel", "section": "section"}],
                "couplings": [{"node_i": "L", "node_j": "R", "dofs": ["ux", "uy"]}],
            }
        )

        self.assertEqual(project.couplings[0].node_i, "L")
        self.assertEqual(project.couplings[0].node_j, "R")
        self.assertEqual(project.couplings[0].dofs, ("ux", "uy"))


if __name__ == "__main__":
    unittest.main()
