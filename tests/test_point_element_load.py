import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.models import Element, ElementLoad, Material, NodalLoad, Node, Project, Section
from mechanics_mvp.preprocess import ValidationError
from mechanics_mvp.project_io import project_from_dict
from mechanics_mvp.solver import Frame2DSolver


MATERIALS = (Material("steel", 200e9),)
SECTIONS = (Section("section", 0.01, 8e-5),)


def frame_project(nodes, *, nodal_loads=(), element_loads=()):
    return Project(
        nodes=nodes,
        materials=MATERIALS,
        sections=SECTIONS,
        elements=(Element("E1", nodes[0].id, nodes[1].id, "steel", "section"),),
        nodal_loads=nodal_loads,
        element_loads=element_loads,
    )


class PointElementLoadTests(unittest.TestCase):
    def test_project_io_parses_point_load_units(self):
        project = project_from_dict(
            {
                "materials": [{"id": "steel", "E": "200 GPa"}],
                "sections": [{"id": "section", "A": "10000 mm^2", "I": "80000000 mm^4"}],
                "nodes": [
                    {"id": "A", "x": "0 m", "restraints": ["ux", "uy", "rz"]},
                    {"id": "B", "x": "4 m"},
                ],
                "elements": [
                    {"id": "E1", "node_i": "A", "node_j": "B", "material": "steel", "section": "section"}
                ],
                "loads": {
                    "elements": [
                        {
                            "element": "E1",
                            "kind": "point_global",
                            "ratio": 0.25,
                            "fx": "5 kN",
                            "fy": "-3 kN",
                            "mz": "2 kN*m",
                        }
                    ]
                },
            }
        )

        load = project.element_loads[0]
        self.assertEqual(load.ratio, 0.25)
        self.assertEqual(load.fx, 5_000.0)
        self.assertEqual(load.fy, -3_000.0)
        self.assertEqual(load.mz, 2_000.0)

    def test_simply_supported_midspan_force_matches_closed_form(self):
        length = 4.0
        force = -10_000.0
        project = frame_project(
            (Node("A", 0.0, 0.0, (True, True, False)), Node("B", length, 0.0, (False, True, False))),
            element_loads=(ElementLoad("E1", "point_global", ratio=0.5, fy=force),),
        )

        result = Frame2DSolver().solve(project)

        self.assertAlmostEqual(result.reactions["A"]["fy"], -force / 2)
        self.assertAlmostEqual(result.reactions["B"]["fy"], -force / 2)
        maximum_moment = max(abs(row["m"]) for row in result.element_diagrams["E1"])
        self.assertAlmostEqual(maximum_moment, abs(force) * length / 4)

    def test_cantilever_interior_force_matches_equilibrium(self):
        length = 5.0
        ratio = 0.3
        force = -12_000.0
        project = frame_project(
            (Node("A", 0.0, 0.0, (True, True, True)), Node("B", length, 0.0)),
            element_loads=(ElementLoad("E1", "point_global", ratio=ratio, fy=force),),
        )

        result = Frame2DSolver().solve(project)

        self.assertAlmostEqual(result.reactions["A"]["fy"], -force)
        self.assertAlmostEqual(result.reactions["A"]["mz"], -force * length * ratio)

    def test_midspan_point_moment_satisfies_global_equilibrium(self):
        length = 6.0
        moment = 18_000.0
        project = frame_project(
            (Node("A", 0.0, 0.0, (True, True, False)), Node("B", length, 0.0, (False, True, False))),
            element_loads=(ElementLoad("E1", "point_global", ratio=0.5, mz=moment),),
        )

        result = Frame2DSolver().solve(project)
        reaction_a = result.reactions["A"]["fy"]
        reaction_b = result.reactions["B"]["fy"]

        self.assertAlmostEqual(reaction_a + reaction_b, 0.0)
        self.assertAlmostEqual(reaction_b * length + moment, 0.0)
        before = max((row for row in result.element_diagrams["E1"] if row["x"] < length / 2), key=lambda row: row["x"])
        at_load = next(row for row in result.element_diagrams["E1"] if row["x"] == length / 2)
        expected_change = reaction_a * (at_load["x"] - before["x"]) - moment
        self.assertAlmostEqual(at_load["m"] - before["m"], expected_change)

    def test_multiple_point_forces_on_one_element_are_all_assembled(self):
        length = 5.0
        loads = (
            ElementLoad("E1", "point_global", ratio=0.2, fy=-4_000.0),
            ElementLoad("E1", "point_global", ratio=0.8, fy=-7_000.0),
        )
        project = frame_project(
            (Node("A", 0.0, 0.0, (True, True, True)), Node("B", length, 0.0)),
            element_loads=loads,
        )

        result = Frame2DSolver().solve(project)

        self.assertAlmostEqual(result.reactions["A"]["fy"], 11_000.0)
        self.assertAlmostEqual(result.reactions["A"]["mz"], 4_000.0 * length * 0.2 + 7_000.0 * length * 0.8)

    def test_truss_interior_load_is_rejected(self):
        project = Project(
            nodes=(Node("A", 0.0, 0.0, (True, True, True)), Node("B", 3.0, 0.0, (False, True, True))),
            materials=MATERIALS,
            sections=SECTIONS,
            elements=(Element("T1", "A", "B", "steel", "section", "truss"),),
            element_loads=(ElementLoad("T1", "point_global", ratio=0.5, fy=-1_000.0),),
        )

        with self.assertRaisesRegex(ValidationError, "桁架杆只能在节点处承受外荷载"):
            Frame2DSolver().solve(project)

    def test_endpoint_point_loads_match_nodal_loads(self):
        nodes = (Node("A", 0.0, 0.0, (True, True, True)), Node("B", 2.0, 0.0))
        cases = ((0.0, "A"), (1.0, "B"))
        for ratio, node_id in cases:
            with self.subTest(ratio=ratio):
                nodal = frame_project(nodes, nodal_loads=(NodalLoad(node_id, fy=-5_000.0),))
                element = frame_project(
                    nodes,
                    element_loads=(ElementLoad("E1", "point_global", ratio=ratio, fy=-5_000.0),),
                )

                nodal_result = Frame2DSolver().solve(nodal)
                element_result = Frame2DSolver().solve(element)

                self.assertEqual(nodal_result.displacements.keys(), element_result.displacements.keys())
                for current_node in nodal_result.displacements:
                    for dof in ("ux", "uy", "rz"):
                        self.assertAlmostEqual(
                            nodal_result.displacements[current_node][dof],
                            element_result.displacements[current_node][dof],
                        )
                self.assertAlmostEqual(
                    nodal_result.reactions["A"].get("fy", 0.0),
                    element_result.reactions["A"].get("fy", 0.0),
                )

    def test_element_with_interior_couple_is_not_a_zero_force_element(self):
        project = frame_project(
            (Node("A", 0.0, 0.0, (True, True, False)), Node("B", 2.0, 0.0, (False, True, False))),
            element_loads=(
                ElementLoad("E1", "point_global", ratio=0.41, mz=1_000.0),
                ElementLoad("E1", "point_global", ratio=0.44, mz=-1_000.0),
            ),
        )

        result = Frame2DSolver().solve(project)

        self.assertAlmostEqual(max(abs(row["m"]) for row in result.element_diagrams["E1"]), 1_000.0)
        self.assertNotIn("E1", result.summary["zero_force_elements"])

    def test_endpoint_element_load_has_same_flexibility_as_nodal_load(self):
        nodes = (Node("A", 0.0, 0.0, (True, True, True)), Node("B", 2.0, 0.0))
        nodal = frame_project(nodes, nodal_loads=(NodalLoad("B", fy=-1_000.0),))
        element = frame_project(
            nodes,
            element_loads=(ElementLoad("E1", "point_global", ratio=1.0, fy=-1_000.0),),
        )

        nodal_result = Frame2DSolver().solve(nodal)
        element_result = Frame2DSolver().solve(element)

        self.assertEqual(
            nodal_result.summary["load_point_flexibility"],
            element_result.summary["load_point_flexibility"],
        )
        flexibility = element_result.summary["load_point_flexibility"]
        self.assertEqual(len(flexibility), 1)
        self.assertAlmostEqual(flexibility[0]["flexibility"], 8.0 / (3 * 200e9 * 8e-5))


if __name__ == "__main__":
    unittest.main()
