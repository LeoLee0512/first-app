"""Sign convention of the axial force diagram: tension is positive."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.models import Element, ElementLoad, Material, NodalLoad, Node, Project, Section
from mechanics_mvp.solver import Frame2DSolver


def _cantilever(**loads):
    return Project(
        nodes=(Node("A", 0.0, 0.0, (True, True, True)), Node("B", 2.0, 0.0)),
        materials=(Material("steel", 200e9),),
        sections=(Section("section", 0.01, 8e-5),),
        elements=(Element("E1", "A", "B", "steel", "section"),),
        **loads,
    )


class AxialConventionTests(unittest.TestCase):
    def test_uniform_axial_load_towards_free_end_gives_tension_that_decays_to_zero(self):
        # qx = +1000 N/m along local x (towards the free end B): the fixed end
        # carries the full 2 kN in tension and the free end carries nothing.
        result = Frame2DSolver().solve(_cantilever(element_loads=(ElementLoad("E1", "uniform_local", qx=1000.0),)))
        rows = result.element_diagrams["E1"]

        self.assertAlmostEqual(rows[0]["n"], 2000.0, places=6)
        self.assertAlmostEqual(rows[-1]["n"], 0.0, places=6)
        # Linear decay in between.
        self.assertAlmostEqual(rows[10]["n"], 1000.0, places=6)
        self.assertAlmostEqual(result.reactions["A"]["fx"], -2000.0, places=6)

    def test_nodal_tension_gives_positive_constant_axial_force(self):
        result = Frame2DSolver().solve(_cantilever(nodal_loads=(NodalLoad("B", fx=1000.0),)))
        rows = result.element_diagrams["E1"]

        for row in rows:
            self.assertAlmostEqual(row["n"], 1000.0, places=6)

    def test_nodal_compression_gives_negative_axial_force(self):
        result = Frame2DSolver().solve(_cantilever(nodal_loads=(NodalLoad("B", fx=-1000.0),)))
        rows = result.element_diagrams["E1"]

        for row in rows:
            self.assertAlmostEqual(row["n"], -1000.0, places=6)

    def test_point_axial_load_on_element_drops_to_zero_beyond_the_load(self):
        # +1000 N at mid-span pulling towards B: tension of 1 kN between the
        # support and the load, zero between the load and the free end.
        result = Frame2DSolver().solve(
            _cantilever(element_loads=(ElementLoad("E1", "point_global", ratio=0.5, fx=1000.0),))
        )
        rows = result.element_diagrams["E1"]

        before = [row["n"] for row in rows if row["x"] < 1.0 - 1e-9]
        after = [row["n"] for row in rows if row["x"] > 1.0 + 1e-9]
        self.assertTrue(before and after)
        for value in before:
            self.assertAlmostEqual(value, 1000.0, places=6)
        for value in after:
            self.assertAlmostEqual(value, 0.0, places=6)


if __name__ == "__main__":
    unittest.main()
