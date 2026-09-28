"""Kinematic degree-of-freedom count W and stiffness-rank stability check."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.models import Element, Material, NodalLoad, Node, Project, Section
from mechanics_mvp.solver import Frame2DSolver, SolverError, classify_system

MATERIALS = (Material("steel", 200e9),)
SECTIONS = (Section("section", 0.01, 8e-5),)


def _project(nodes, elements, loads=()):
    return Project(nodes=nodes, materials=MATERIALS, sections=SECTIONS, elements=elements, nodal_loads=loads)


class SystemClassificationTests(unittest.TestCase):
    def test_simply_supported_beam_is_determinate(self):
        project = _project(
            (Node("A", 0.0, 0.0, (True, True, False)), Node("B", 4.0, 0.0, (False, True, False))),
            (Element("E1", "A", "B", "steel", "section"),),
            (NodalLoad("B", fx=1.0),),
        )
        system = classify_system(project)
        self.assertEqual(system["degrees_of_freedom"], 0)
        self.assertEqual(system["classification"], "determinate")
        self.assertEqual(system["indeterminacy"], 0)

        result = Frame2DSolver().solve(project)
        self.assertEqual(result.summary["system"]["degrees_of_freedom"], 0)

    def test_double_fixed_portal_frame_is_three_times_indeterminate(self):
        project = _project(
            (
                Node("A", 0.0, 0.0, (True, True, True)),
                Node("B", 0.0, 3.0),
                Node("C", 4.0, 3.0),
                Node("D", 4.0, 0.0, (True, True, True)),
            ),
            (
                Element("E1", "A", "B", "steel", "section"),
                Element("E2", "B", "C", "steel", "section"),
                Element("E3", "C", "D", "steel", "section"),
            ),
            (NodalLoad("B", fx=1.0),),
        )
        system = classify_system(project)
        self.assertEqual(system["degrees_of_freedom"], -3)
        self.assertEqual(system["indeterminacy"], 3)
        self.assertEqual(system["classification"], "indeterminate")
        Frame2DSolver().solve(project)

    def test_three_hinged_frame_counts_the_release_as_a_hinge(self):
        project = _project(
            (
                Node("A", 0.0, 0.0, (True, True, False)),
                Node("B", 2.0, 2.0),
                Node("C", 4.0, 0.0, (True, True, False)),
            ),
            (
                Element("E1", "A", "B", "steel", "section", moment_release_j=True),
                Element("E2", "B", "C", "steel", "section"),
            ),
        )
        system = classify_system(project)
        self.assertEqual(system["hinged_connections"], 1)
        self.assertEqual(system["degrees_of_freedom"], 0)
        self.assertEqual(system["classification"], "determinate")

    def test_truss_triangle_counts_pin_joints(self):
        project = _project(
            (
                Node("A", 0.0, 0.0, (True, True, False)),
                Node("B", 4.0, 0.0, (False, True, False)),
                Node("C", 2.0, 2.0),
            ),
            (
                Element("E1", "A", "B", "steel", "section", "truss"),
                Element("E2", "B", "C", "steel", "section", "truss"),
                Element("E3", "C", "A", "steel", "section", "truss"),
            ),
            (NodalLoad("C", fy=-1.0),),
        )
        system = classify_system(project)
        self.assertEqual(system["hinged_connections"], 6)
        self.assertEqual(system["pin_joints"], 3)
        self.assertEqual(system["degrees_of_freedom"], 0)
        Frame2DSolver().solve(project)

    def test_rz_restraint_at_a_pin_joint_is_not_counted(self):
        project = _project(
            (Node("A", 0.0, 0.0, (True, True, True)), Node("B", 3.0, 0.0, (False, True, True))),
            (Element("T1", "A", "B", "steel", "section", "truss"),),
            (NodalLoad("B", fx=1.0),),
        )
        system = classify_system(project)
        self.assertEqual(system["restraints"], 3)
        self.assertEqual(system["degrees_of_freedom"], 0)

    def test_release_at_the_only_support_is_a_mechanism(self):
        project = _project(
            (Node("A", 0.0, 0.0, (True, True, True)), Node("B", 4.0, 0.0)),
            (Element("E1", "A", "B", "steel", "section", moment_release_i=True),),
            (NodalLoad("B", fy=-1.0),),
        )
        self.assertEqual(classify_system(project)["degrees_of_freedom"], 1)
        with self.assertRaises(SolverError) as context:
            Frame2DSolver().solve(project)
        self.assertIn("W = 1", str(context.exception))
        self.assertIn("常变", str(context.exception))

    def test_parallel_rollers_are_reported_as_improperly_arranged(self):
        project = _project(
            (
                Node("A", 0.0, 0.0, (False, True, False)),
                Node("B", 2.0, 0.0, (False, True, False)),
                Node("C", 4.0, 0.0, (False, True, False)),
            ),
            (Element("E1", "A", "B", "steel", "section"), Element("E2", "B", "C", "steel", "section")),
            (NodalLoad("B", fy=-1.0),),
        )
        self.assertEqual(classify_system(project)["degrees_of_freedom"], 0)
        with self.assertRaises(SolverError) as context:
            Frame2DSolver().solve(project)
        self.assertIn("W = 0", str(context.exception))
        self.assertIn("约束布置不当", str(context.exception))


if __name__ == "__main__":
    unittest.main()
