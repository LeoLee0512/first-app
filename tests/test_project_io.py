import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.preprocess import ValidationError
from mechanics_mvp.project_io import load_project, project_from_dict
from mechanics_mvp.solver import Frame2DSolver


class ProjectIoTests(unittest.TestCase):
    def test_project_from_dict_converts_units(self):
        project = project_from_dict(
            {
                "materials": [{"id": "steel", "E": "200 GPa"}],
                "sections": [{"id": "section", "A": "10000 mm^2", "I": "80000000 mm^4"}],
                "nodes": [
                    {"id": "A", "x": "0 m", "restraints": ["ux", "uy", "rz"]},
                    {"id": "B", "x": "2000 mm"},
                ],
                "elements": [
                    {
                        "id": "E1",
                        "node_i": "A",
                        "node_j": "B",
                        "material": "steel",
                        "section": "section",
                    }
                ],
                "loads": {"nodes": [{"node": "B", "fy": "-10 kN"}]},
            }
        )

        self.assertAlmostEqual(project.nodes[1].x, 2.0)
        self.assertAlmostEqual(project.materials[0].elastic_modulus, 200e9)
        self.assertAlmostEqual(project.sections[0].area, 0.01)
        self.assertAlmostEqual(project.sections[0].inertia, 8e-5)
        self.assertAlmostEqual(project.nodal_loads[0].fy, -10_000.0)

    def test_restraints_string_keeps_the_named_support(self):
        """A roller written as the string "uy" must restrain uy, not vanish."""
        project = project_from_dict(
            {
                "materials": [{"id": "steel", "E": 200e9}],
                "sections": [{"id": "section", "A": 0.01, "I": 8e-5}],
                "nodes": [
                    {"id": "A", "x": 0, "y": 0, "restraints": "ux, uy, rz"},
                    {"id": "B", "x": 2, "y": 0, "restraints": "uy"},
                ],
                "elements": [
                    {"id": "E1", "node_i": "A", "node_j": "B", "material": "steel", "section": "section"}
                ],
                "loads": {"nodes": [{"node": "B", "fy": -1000}]},
            }
        )

        self.assertEqual(project.nodes[0].restraints, (True, True, True))
        self.assertEqual(project.nodes[1].restraints, (False, True, False))

    def test_restraints_accept_name_list_map_and_null(self):
        project = project_from_dict(
            {
                "nodes": [
                    {"id": "A", "x": 0, "y": 0, "restraints": ["uy"]},
                    {"id": "B", "x": 1, "y": 0, "restraints": {"ux": True, "uy": False}},
                    {"id": "C", "x": 2, "y": 0, "restraints": None},
                ]
            }
        )

        self.assertEqual(project.nodes[0].restraints, (False, True, False))
        self.assertEqual(project.nodes[1].restraints, (True, False, False))
        self.assertEqual(project.nodes[2].restraints, (False, False, False))

    def test_restraints_reject_unknown_names(self):
        for restraints in ("vx", ["fx"], {"kx": True}, 7):
            with self.subTest(restraints=restraints):
                with self.assertRaises(ValidationError):
                    project_from_dict({"nodes": [{"id": "A", "x": 0, "y": 0, "restraints": restraints}]})

    def test_null_or_wrong_type_fields_raise_clean_validation_errors(self):
        cases = (
            {"nodes": "abc"},
            {"loads": [1, 2]},
            {"metadata": ["a"], "nodes": [{"id": "A", "x": 0, "y": 0}]},
        )
        for raw in cases:
            with self.subTest(raw=raw):
                with self.assertRaises(ValidationError):
                    project_from_dict(raw)

    def test_null_collections_are_treated_as_absent(self):
        project = project_from_dict(
            {
                "nodes": [{"id": "A", "x": 0, "y": 0}],
                "materials": None,
                "sections": None,
                "elements": None,
                "loads": None,
                "metadata": None,
                "couplings": None,
            }
        )

        self.assertEqual(project.nodes[0].id, "A")
        self.assertEqual(project.materials, ())
        self.assertEqual(project.sections, ())
        self.assertEqual(project.elements, ())
        self.assertEqual(project.nodal_loads, ())
        self.assertEqual(project.element_loads, ())
        self.assertEqual(project.metadata, {})
        self.assertEqual(project.couplings, ())

    def test_restraints_3d_parse_string_and_reject_unknown(self):
        project = project_from_dict(
            {"nodes": [{"id": "A", "x": 0, "y": 0, "restraints_3d": "ux, uy"}]}
        )
        self.assertEqual(project.nodes[0].restraints_3d, (True, True, False, False, False, False))

        with self.assertRaises(ValidationError):
            project_from_dict(
                {"nodes": [{"id": "A", "x": 0, "y": 0, "restraints_3d": "wz"}]}
            )

    def test_load_example_and_solve(self):
        path = Path(__file__).resolve().parents[1] / "examples" / "cantilever_beam.json"
        project = load_project(path)
        result = Frame2DSolver().solve(project)

        self.assertIn("B", result.displacements)
        self.assertLess(result.displacements["B"]["uy"], 0.0)
        self.assertAlmostEqual(result.reactions["A"]["fy"], 10_000.0)


if __name__ == "__main__":
    unittest.main()
