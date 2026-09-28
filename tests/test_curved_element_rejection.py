import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.models import Element, Material, Node, Project, Section
from mechanics_mvp.preprocess import SUPPORTED_ELEMENT_TYPES, ValidationError, validate_project


class CurvedElementRejectionTests(unittest.TestCase):
    def test_arc_and_tee_are_no_longer_solver_element_types(self):
        self.assertEqual(SUPPORTED_ELEMENT_TYPES, {"frame", "rigid", "truss"})

    def test_arc_element_is_rejected_with_discretisation_hint(self):
        for element_type in ("arc", "tee", "right_angle", "freeform"):
            project = Project(
                nodes=(Node("A", 0.0, 0.0, (True, True, True)), Node("B", 2.0, 0.0)),
                materials=(Material("steel", 200e9),),
                sections=(Section("section", 0.01, 8e-5),),
                elements=(Element("E1", "A", "B", "steel", "section", element_type),),
            )
            with self.assertRaises(ValidationError) as context:
                validate_project(project)
            self.assertIn("discretised", str(context.exception))
            self.assertIn(element_type, str(context.exception))


if __name__ == "__main__":
    unittest.main()
