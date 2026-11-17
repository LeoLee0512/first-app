import sys
import unittest
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.engine import solve_with_backend
from mechanics_mvp.project_io import project_from_dict
from mechanics_mvp.report import build_report_pdf, build_report_text
from mechanics_mvp.webapp import dynamics_report_payload


def sample_project():
    return project_from_dict(
        {
            "metadata": {"name": "canvas_project", "report_scope": "whole"},
            "materials": [{"id": "steel", "E": "200 GPa"}],
            "sections": [{"id": "default", "A": "10000 mm^2", "I": "80000000 mm^4"}],
            "nodes": [
                {"id": "N1", "x": "0 m", "y": "0 m", "restraints": ["ux", "uy", "rz"]},
                {"id": "N2", "x": "4.5 m", "y": "0 m"},
            ],
            "elements": [
                {
                    "id": "E1",
                    "node_i": "N1",
                    "node_j": "N2",
                    "material": "steel",
                    "section": "default",
                }
            ],
            "loads": {"nodes": [{"node": "N2", "fy": "-10 kN"}]},
        }
    )


class ReportTests(unittest.TestCase):
    def test_report_text_is_human_readable_chinese_without_raw_json(self):
        project = sample_project()
        result = solve_with_backend(project)

        text = build_report_text(
            project,
            result,
            options=["internal", "moment", "shear", "axial", "displacement", "reaction", "danger"],
        )

        self.assertIn("求解结果", text)
        self.assertIn("模型输入", text)
        self.assertIn("节点位移与转角", text)
        self.assertIn("杆端内力", text)
        self.assertIn("控制方程与符号", text)
        self.assertIn("[K]{u}={P}", text)
        self.assertIn("计算推导过程", text)
        self.assertIn("计算结论", text)
        self.assertNotIn('"dangerous_sections"', text)
        self.assertNotIn("Mechanics MVP Calculation Report", text)

    def test_report_pdf_contains_extractable_chinese_formulas_and_conclusion(self):
        project = sample_project()
        result = solve_with_backend(project)

        report = build_report_pdf(project, result, options=["displacement", "reaction"])
        reader = PdfReader(BytesIO(report))
        extracted = "\n".join(page.extract_text() or "" for page in reader.pages)

        self.assertTrue(report.startswith(b"%PDF-"))
        self.assertGreater(len(reader.pages), 0)
        self.assertIn("计算力学求解计算书", extracted)
        self.assertIn("求解结果", extracted)
        self.assertIn("控制方程与符号", extracted)
        self.assertIn("[K]{u}={P}", extracted)
        self.assertIn("计算结论", extracted)
        self.assertNotIn("�", extracted)

    def test_dynamics_report_payload_builds_chinese_pdf(self):
        report = dynamics_report_payload(
            {
                "report_text": (
                    "动力学计算书\n"
                    "求解结果\n"
                    "求解模块：二维多对象独立质点动力学\n"
                    "速度：1 m/s\n"
                    "控制方程与符号\n"
                    "平动方程：m·a=ΣF\n"
                    "数值积分过程\n"
                    "四阶 Runge-Kutta 方法\n"
                    "计算结论\n"
                    "当前结果用于学习与验证。"
                )
            }
        )
        reader = PdfReader(BytesIO(report))
        extracted = "\n".join(page.extract_text() or "" for page in reader.pages)

        self.assertTrue(report.startswith(b"%PDF-"))
        self.assertIn("动力学计算书", extracted)
        self.assertIn("二维多对象独立质点动力学", extracted)
        self.assertIn("m·a=ΣF", extracted)
        self.assertIn("四阶 Runge-Kutta", extracted)
        self.assertIn("计算结论", extracted)
        self.assertNotIn("�", extracted)

    def test_static_report_lists_point_load_magnitude_position_and_moment(self):
        project = project_from_dict(
            {
                "materials": [{"id": "steel", "E": "200 GPa"}],
                "sections": [{"id": "default", "A": "10000 mm^2", "I": "80000000 mm^4"}],
                "nodes": [
                    {"id": "N1", "x": "0 m", "y": "0 m", "restraints": ["ux", "uy", "rz"]},
                    {"id": "N2", "x": "4 m", "y": "0 m"},
                ],
                "elements": [
                    {
                        "id": "E1",
                        "node_i": "N1",
                        "node_j": "N2",
                        "material": "steel",
                        "section": "default",
                    }
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
        text = build_report_text(project, solve_with_backend(project))

        self.assertIn("类型=杆中集中作用", text)
        self.assertIn("位置比例=0.25", text)
        self.assertIn("Fx=5 kN", text)
        self.assertIn("Fy=-3 kN", text)
        self.assertIn("Mz=2 kN·m", text)

    def test_selection_report_does_not_call_the_frame_an_isolated_body(self):
        project = project_from_dict(
            {
                "metadata": {"name": "canvas_project", "report_scope": "selection"},
                "materials": [{"id": "steel", "E": "200 GPa"}],
                "sections": [{"id": "default", "A": "10000 mm^2", "I": "80000000 mm^4"}],
                "nodes": [
                    {"id": "N1", "x": "0 m", "y": "0 m", "restraints": ["ux", "uy", "rz"]},
                    {"id": "N2", "x": "2 m", "y": "0 m"},
                    {"id": "N3", "x": "4 m", "y": "0 m"},
                ],
                "elements": [
                    {"id": "E1", "node_i": "N1", "node_j": "N2", "material": "steel", "section": "default"},
                    {"id": "E2", "node_i": "N2", "node_j": "N3", "material": "steel", "section": "default"},
                ],
                "loads": {"nodes": [{"node": "N3", "fy": "-10 kN"}]},
            }
        )
        text = build_report_text(project, solve_with_backend(project), options=["displacement", "internal", "moment"])

        self.assertIn("整体模型（求解整架；所选杆件只用于画面显示）", text)
        self.assertNotIn("选中隔离体", text)
        self.assertIn("E1", text)
        self.assertIn("E2", text)

    def test_truss_report_does_not_say_determinate_and_indeterminate(self):
        project = project_from_dict(
            {
                "materials": [{"id": "steel", "E": "200 GPa"}],
                "sections": [{"id": "default", "A": "10000 mm^2", "I": "80000000 mm^4"}],
                "nodes": [
                    {"id": "A", "x": "0 m", "y": "0 m", "restraints": ["ux", "uy"]},
                    {"id": "B", "x": "4 m", "y": "0 m", "restraints": ["uy"]},
                    {"id": "C", "x": "2 m", "y": "2 m"},
                ],
                "elements": [
                    {"id": "E1", "node_i": "A", "node_j": "B", "material": "steel", "section": "default", "type": "truss"},
                    {"id": "E2", "node_i": "B", "node_j": "C", "material": "steel", "section": "default", "type": "truss"},
                    {"id": "E3", "node_i": "C", "node_j": "A", "material": "steel", "section": "default", "type": "truss"},
                ],
                "loads": {"nodes": [{"node": "C", "fy": "-1 kN"}]},
            }
        )
        text = build_report_text(project, solve_with_backend(project))
        beam = build_report_text(sample_project(), solve_with_backend(sample_project()))

        self.assertIn("几何不变、静定结构", text)
        self.assertNotIn("可能为超静定", text)
        self.assertNotIn("静定指数：", text)
        self.assertIn("不计入桁架铰", text)
        self.assertIn("静定指数：", beam)

    def test_inclined_support_report_shows_angle_and_global_components(self):
        """A 30° roller must not read as a plain uy support in the report."""
        project = project_from_dict(
            {
                "materials": [{"id": "steel", "E": "200 GPa"}],
                "sections": [{"id": "default", "A": "10000 mm^2", "I": "80000000 mm^4"}],
                "nodes": [
                    {"id": "A", "x": "0 m", "y": "0 m", "restraints": ["ux", "uy", "rz"]},
                    {"id": "B", "x": "2 m", "y": "0 m", "restraints": ["uy"], "support_angle": 30},
                ],
                "elements": [
                    {"id": "E1", "node_i": "A", "node_j": "B", "material": "steel", "section": "default"}
                ],
                "loads": {"nodes": [{"node": "B", "fy": "-1 kN"}]},
            }
        )
        text = build_report_text(project, solve_with_backend(project))

        self.assertIn("约束=uy，支座方向=30°", text)
        self.assertIn("约束 ux/uy 沿支座轴", text)
        self.assertIn("30° 斜支座，Fx/Fy 为全局分量", text)


if __name__ == "__main__":
    unittest.main()
