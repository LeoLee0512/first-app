import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.units import UnitError, from_si, to_si


class UnitTests(unittest.TestCase):
    def test_numeric_defaults_to_si(self):
        self.assertEqual(to_si(12.0), 12.0)

    def test_object_quantity_converts_to_si(self):
        self.assertEqual(to_si({"value": 12, "unit": "kN"}), 12000.0)

    def test_string_quantity_converts_to_si(self):
        self.assertAlmostEqual(to_si("2500 mm"), 2.5)
        self.assertAlmostEqual(to_si("200 GPa"), 200_000_000_000.0)

    def test_from_si_converts_to_display_unit(self):
        self.assertEqual(from_si(25000.0, "kN"), 25.0)

    def test_unknown_unit_raises(self):
        with self.assertRaises(UnitError):
            to_si("1 furlong")

    def test_incompatible_unit_dimension_raises(self):
        for quantity in ("10 m", {"value": 10, "unit": "m"}):
            with self.subTest(quantity=quantity):
                with self.assertRaisesRegex(UnitError, "dimension"):
                    to_si(quantity, default_unit="N")

    def test_compatible_unit_dimension_converts(self):
        self.assertEqual(to_si("1 kN", default_unit="N"), 1000.0)
        self.assertEqual(to_si("2500 mm", default_unit="m"), 2.5)

    def test_project_force_rejects_length_unit(self):
        from mechanics_mvp.project_io import project_from_dict

        raw = {
            "materials": [{"id": "m", "E": "200 GPa"}],
            "sections": [{"id": "s", "A": "10000 mm^2", "I": "80000000 mm^4"}],
            "nodes": [
                {"id": "A", "x": "0 m", "restraints": ["ux", "uy", "rz"]},
                {"id": "B", "x": "2 m"},
            ],
            "elements": [{"id": "E", "node_i": "A", "node_j": "B", "material": "m", "section": "s"}],
            "loads": {"nodes": [{"node": "B", "fy": "10 m"}]},
        }
        with self.assertRaisesRegex(UnitError, "dimension"):
            project_from_dict(raw)


if __name__ == "__main__":
    unittest.main()
