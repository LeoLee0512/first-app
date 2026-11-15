import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.diagnostics import diagnose_project
from mechanics_mvp.models import Element, Material, Node, Project, Section


def issue_codes(diagnostics):
    return {issue.code for issue in diagnostics.issues}


class DiagnosticsTests(unittest.TestCase):
    def test_simply_supported_beam_is_roughly_determinate(self):
        project = Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, False)),
                Node("B", 4.0, 0.0, (False, True, False)),
            ),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(Element("E1", "A", "B", "steel", "section"),),
        )

        diagnostics = diagnose_project(project)

        self.assertEqual(diagnostics.node_count, 2)
        self.assertEqual(diagnostics.element_count, 1)
        self.assertEqual(diagnostics.restrained_dof_count, 3)
        self.assertEqual(diagnostics.total_dof_count, 6)
        self.assertEqual(diagnostics.free_dof_count, 3)
        self.assertEqual(diagnostics.determinacy_index, 0)
        self.assertIn("roughly_determinate", issue_codes(diagnostics))

    def test_isolated_node_reports_warning(self):
        project = Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, False)),
                Node("B", 4.0, 0.0, (False, True, False)),
                Node("C", 2.0, 2.0),
            ),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(Element("E1", "A", "B", "steel", "section"),),
        )

        diagnostics = diagnose_project(project)

        self.assertIn("isolated_node", issue_codes(diagnostics))
        self.assertIn(["C"], diagnostics.connected_components)

    def test_zero_length_element_reports_error(self):
        project = Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, True)),
                Node("B", 0.0, 0.0),
            ),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(Element("E1", "A", "B", "steel", "section"),),
        )

        diagnostics = diagnose_project(project)

        self.assertIn("zero_length_element", issue_codes(diagnostics))
        zero_length_issue = next(issue for issue in diagnostics.issues if issue.code == "zero_length_element")
        self.assertEqual(zero_length_issue.level, "error")

    def test_truss_does_not_treat_the_rigid_frame_index_as_indeterminate(self):
        project = Project(
            nodes=(
                Node("A", 0.0, 0.0, (True, True, False)),
                Node("B", 4.0, 0.0, (False, True, False)),
                Node("C", 2.0, 2.0),
            ),
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(
                Element("E1", "A", "B", "steel", "section", "truss"),
                Element("E2", "B", "C", "steel", "section", "truss"),
                Element("E3", "C", "A", "steel", "section", "truss"),
            ),
        )

        diagnostics = diagnose_project(project)

        self.assertTrue(diagnostics.index_ignores_hinges)
        self.assertEqual(diagnostics.determinacy_index, 3)
        self.assertNotIn("roughly_indeterminate", issue_codes(diagnostics))
        self.assertIn("index_ignores_hinges", issue_codes(diagnostics))


if __name__ == "__main__":
    unittest.main()
