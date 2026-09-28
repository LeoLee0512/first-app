"""Inclined (rotated) supports: restraints applied in the support axes."""

import math
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.models import Element, Material, NodalLoad, Node, Project, Section
from mechanics_mvp.project_io import project_from_dict
from mechanics_mvp.solver import Frame2DSolver


class InclinedSupportTests(unittest.TestCase):
    def simply_supported(self, angle: float) -> Project:
        length = 4.0
        return Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, False)),
                Node("C", length / 2.0, 0.0),
                Node("B", length, 0.0, (False, True, False), support_angle=angle),
            ),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(
                Element("E1", "A", "C", "steel", "section"),
                Element("E2", "C", "B", "steel", "section"),
            ),
            nodal_loads=(NodalLoad("C", fy=-10_000.0),),
        )

    def test_roller_rotated_30_degrees_carries_normal_reaction(self):
        load = 10_000.0
        angle = 30.0
        result = Frame2DSolver().solve(self.simply_supported(angle))

        radians = math.radians(angle)
        cosine, sine = math.cos(radians), math.sin(radians)
        reaction = result.reactions["B"]
        # Both global components are reported for the inclined support.
        self.assertIn("fx", reaction)
        self.assertIn("fy", reaction)
        normal = -sine * reaction["fx"] + cosine * reaction["fy"]
        tangential = cosine * reaction["fx"] + sine * reaction["fy"]
        self.assertAlmostEqual(normal, load / (2.0 * cosine), places=6)
        self.assertAlmostEqual(tangential, 0.0, places=6)
        # Vertical component still equals P/2, and A balances the horizontal thrust.
        self.assertAlmostEqual(reaction["fy"], load / 2.0, places=6)
        self.assertAlmostEqual(result.reactions["A"]["fx"], -reaction["fx"], places=6)
        self.assertAlmostEqual(result.reactions["A"]["fy"], load / 2.0, places=6)

        displacement = result.displacements["B"]
        normal_displacement = -sine * displacement["ux"] + cosine * displacement["uy"]
        self.assertAlmostEqual(normal_displacement, 0.0, places=12)
        # The node slides along the inclined ground.
        self.assertNotAlmostEqual(displacement["ux"], 0.0, places=9)

    def test_zero_angle_matches_plain_roller(self):
        plain = Frame2DSolver().solve(self.simply_supported(0.0))
        self.assertNotIn("fx", plain.reactions["B"])
        self.assertAlmostEqual(plain.reactions["B"]["fy"], 5_000.0, places=6)
        self.assertAlmostEqual(plain.displacements["B"]["uy"], 0.0, places=12)

    def test_full_turn_is_treated_as_zero_angle(self):
        result = Frame2DSolver().solve(self.simply_supported(360.0))
        self.assertNotIn("fx", result.reactions["B"])
        self.assertAlmostEqual(result.reactions["B"]["fy"], 5_000.0, places=6)

    def test_inclined_pin_reports_both_components_and_matches_plain_pin(self):
        def project(angle: float) -> Project:
            return Project(
                nodes=(
                    Node("A", 0.0, 0.0, (True, True, False), support_angle=angle),
                    Node("B", 3.0, 0.0, (True, True, False)),
                ),
                materials=(Material("steel", 200e9),),
                sections=(Section("section", 0.01, 8e-5),),
                elements=(Element("E1", "A", "B", "steel", "section"),),
                nodal_loads=(NodalLoad("A", mz=4_000.0),),
            )

        plain = Frame2DSolver().solve(project(0.0))
        rotated = Frame2DSolver().solve(project(45.0))
        for key in ("fx", "fy"):
            self.assertAlmostEqual(rotated.reactions["A"][key], plain.reactions["A"][key], places=6)
        self.assertAlmostEqual(rotated.displacements["A"]["rz"], plain.displacements["A"]["rz"], places=12)

    def test_project_from_dict_reads_support_angle(self):
        project = project_from_dict(
            {
                "materials": [{"id": "steel", "E": "200 GPa"}],
                "sections": [{"id": "section", "A": "10000 mm^2", "I": "80000000 mm^4"}],
                "nodes": [
                    {"id": "A", "x": "0 m", "restraints": ["ux", "uy"]},
                    {"id": "B", "x": "4 m", "restraints": ["uy"], "support_angle": 30},
                ],
                "elements": [{"id": "E1", "node_i": "A", "node_j": "B", "material": "steel", "section": "section"}],
            }
        )

        self.assertAlmostEqual(project.nodes[0].support_angle, 0.0)
        self.assertAlmostEqual(project.nodes[1].support_angle, 30.0)


if __name__ == "__main__":
    unittest.main()
