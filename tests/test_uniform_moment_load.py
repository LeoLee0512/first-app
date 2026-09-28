"""Uniformly distributed couple (uniform_moment_local) on frame elements."""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.models import Element, ElementLoad, Material, Node, Project, Section
from mechanics_mvp.preprocess import ValidationError
from mechanics_mvp.project_io import project_from_dict
from mechanics_mvp.solver import Frame2DSolver
from mechanics_mvp.units import to_si


class UniformMomentLoadTests(unittest.TestCase):
    E = 200e9
    I = 8e-5

    def cantilever(self, length: float, intensity: float, element_type: str = "frame") -> Project:
        return Project(
            nodes=(Node("A", 0.0, 0.0, (True, True, True)), Node("B", length, 0.0)),
            materials=(Material("steel", self.E),),
            sections=(Section("section", 0.01, self.I),),
            elements=(Element("E1", "A", "B", "steel", "section", element_type),),
            element_loads=(ElementLoad("E1", "uniform_moment_local", mz=intensity),),
        )

    def test_cantilever_under_uniform_couple_matches_closed_form(self):
        length = 4.0
        intensity = 3_000.0  # 3 kN*m/m, counter-clockwise
        result = Frame2DSolver().solve(self.cantilever(length, intensity))

        total_couple = intensity * length  # 12 kN*m
        # The support must balance the whole applied couple with no force.
        self.assertAlmostEqual(result.reactions["A"]["mz"], -total_couple, places=6)
        self.assertAlmostEqual(result.reactions["A"]["fy"], 0.0, places=6)
        self.assertAlmostEqual(result.reactions["A"]["fx"], 0.0, places=6)
        # Free-end rotation θ = mL²/(2EI) and deflection v = mL³/(3EI).
        self.assertAlmostEqual(
            result.displacements["B"]["rz"], intensity * length**2 / (2.0 * self.E * self.I), places=12
        )
        self.assertAlmostEqual(
            result.displacements["B"]["uy"], intensity * length**3 / (3.0 * self.E * self.I), places=12
        )
        # Moment diagram M(x) = m (L - x): mL at the fixed end, zero at the tip.
        rows = result.element_diagrams["E1"]
        self.assertAlmostEqual(rows[0]["m"], total_couple, places=6)
        self.assertAlmostEqual(rows[-1]["m"], 0.0, places=6)
        self.assertAlmostEqual(rows[10]["m"], total_couple / 2.0, places=6)
        for row in rows:
            self.assertAlmostEqual(row["v"], 0.0, places=6)
            self.assertAlmostEqual(row["n"], 0.0, places=6)
        # Element end forces: the node applies -mL at end i, nothing at end j.
        forces = result.element_end_forces["E1"]
        self.assertAlmostEqual(forces["m_i"], -total_couple, places=6)
        self.assertAlmostEqual(forces["m_j"], 0.0, places=6)
        self.assertAlmostEqual(forces["v_i"], 0.0, places=6)

    def test_simply_supported_beam_under_uniform_couple(self):
        # Couple mL is balanced by a force couple R = mL / L = m at the supports.
        length = 4.0
        intensity = 2_000.0
        project = Project(
            nodes=(Node("A", 0.0, 0.0, (True, True, False)), Node("B", length, 0.0, (False, True, False))),
            materials=(Material("steel", self.E),),
            sections=(Section("section", 0.01, self.I),),
            elements=(Element("E1", "A", "B", "steel", "section"),),
            element_loads=(ElementLoad("E1", "uniform_moment_local", mz=intensity),),
        )
        result = Frame2DSolver().solve(project)

        self.assertAlmostEqual(result.reactions["A"]["fy"], intensity, places=6)
        self.assertAlmostEqual(result.reactions["B"]["fy"], -intensity, places=6)
        rows = result.element_diagrams["E1"]
        self.assertAlmostEqual(rows[0]["m"], 0.0, places=6)
        self.assertAlmostEqual(rows[-1]["m"], 0.0, places=6)
        # Shear is constant (+m) and the moment stays zero along the beam.
        for row in rows:
            self.assertAlmostEqual(row["v"], intensity, places=6)
            self.assertAlmostEqual(row["m"], 0.0, places=6)

    def test_project_from_dict_uses_moment_per_length_default_unit(self):
        project = project_from_dict(
            {
                "materials": [{"id": "steel", "E": "200 GPa"}],
                "sections": [{"id": "section", "A": "10000 mm^2", "I": "80000000 mm^4"}],
                "nodes": [
                    {"id": "A", "x": "0 m", "restraints": ["ux", "uy", "rz"]},
                    {"id": "B", "x": "4 m"},
                ],
                "elements": [{"id": "E1", "node_i": "A", "node_j": "B", "material": "steel", "section": "section"}],
                "loads": {
                    "elements": [
                        {"element": "E1", "kind": "uniform_moment_local", "mz": "3 kN*m/m"},
                        {"element": "E1", "kind": "uniform_moment_local", "mz": 1.5},
                    ]
                },
            }
        )

        self.assertAlmostEqual(project.element_loads[0].mz, 3_000.0)
        self.assertAlmostEqual(project.element_loads[1].mz, 1.5)

    def test_units_accept_moment_per_length(self):
        self.assertAlmostEqual(to_si("2 kN*m/m"), 2_000.0)
        self.assertAlmostEqual(to_si("2 N*m/m"), 2.0)

    def test_uniform_couple_on_truss_is_rejected(self):
        with self.assertRaises(ValidationError):
            Frame2DSolver().solve(self.cantilever(4.0, 1_000.0, "truss"))


if __name__ == "__main__":
    unittest.main()
