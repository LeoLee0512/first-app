"""Human-readable Chinese calculation report generation."""

from __future__ import annotations

import base64
import binascii
import math
import re
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image as ReportImage
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer

from .models import AnalysisResult, ElementLoad, Project


OPTION_LABELS = {
    "determinacy": "静定/超静定分析",
    "system": "体系判断",
    "internal": "各内力求解",
    "moment": "弯矩图",
    "shear": "剪力图",
    "axial": "轴力图",
    "displacement": "位移与转角",
    "reaction": "支座反力",
    "danger": "危险截面",
    "flexibility": "柔度",
    "stress": "组合正应力估算",
    "strain": "应变",
    "stress_strain": "应力-应变图",
}

DIAGNOSTIC_MESSAGES = {
    "duplicate_node_id": "存在重复节点编号。",
    "missing_node_i": "存在杆件引用了缺失的起点节点。",
    "missing_node_j": "存在杆件引用了缺失的终点节点。",
    "zero_length_element": "存在零长度杆件。",
    "disconnected_structure": "模型存在多个不连通部分。",
    "isolated_node": "存在未连接到任何杆件的孤立节点。",
    "no_free_dof": "模型没有可求解的自由自由度。",
    "likely_mechanism": "静定指数为负，模型可能为机构或约束不足。",
    "roughly_determinate": "静定指数为 0，拓扑估算可能为静定结构。",
    "roughly_indeterminate": "静定指数为正，拓扑估算可能为超静定结构。",
}

REPORT_SECTION_HEADINGS = {
    "求解结果",
    "模型概况",
    "模型输入",
    "模型诊断",
    "节点位移与转角",
    "支座反力",
    "杆端内力",
    "内力图极值",
    "应力与应变",
    "危险截面",
    "柔度",
    "控制方程与符号",
    "计算推导过程",
    "计算结论",
    "对象定义",
    "场定义",
    "外力定义",
    "数值积分过程",
    "适用范围与限制",
}

_REPORT_FONT_NAMES: tuple[str, str] | None = None


def build_report_text(project: Project, result: AnalysisResult, *, options: list[str] | None = None) -> str:
    """Build a concise engineering report without exposing raw JSON."""

    selected = [item for item in (options or []) if item in OPTION_LABELS]
    enabled = lambda name: not selected or name in selected
    scope = "选中隔离体" if project.metadata.get("report_scope") == "selection" else "整体模型"
    project_name = project.metadata.get("name", "未命名工程")
    if project_name == "canvas_project":
        project_name = "当前画布工程"
    labels = "、".join(OPTION_LABELS[item] for item in selected) or "完整结构分析"
    lines = [
        "计算力学求解计算书",
        f"生成时间：{datetime.now().astimezone().strftime('%Y-%m-%d %H:%M:%S %z')}",
        f"工程名称：{project_name}",
        "求解模块：二维线弹性梁柱/桁架矩阵位移法",
        "",
        "求解结果",
        f"求解范围：{scope}",
        f"求解内容：{labels}",
        f"体系判断：{_system_judgement(project, result)}",
        "",
        "模型概况",
        f"- 节点数：{len(project.nodes)}",
        f"- 杆件数：{len(project.elements)}",
        f"- 节点荷载数：{len(project.nodal_loads)}",
        f"- 杆件荷载数：{len(project.element_loads)}",
        "",
    ]

    _append_static_model_inputs(lines, project)

    _append_diagnostics(lines, result.summary.get("diagnostics"))

    if enabled("displacement"):
        lines.append("节点位移与转角")
        for node_id, values in _sorted_items(result.displacements):
            lines.append(
                f"- {node_id}: ux={_fmt(values.get('ux', 0.0) * 1000)} mm，"
                f"uy={_fmt(values.get('uy', 0.0) * 1000)} mm，"
                f"θ={_fmt(values.get('rz', 0.0))} rad"
            )
        lines.append("")

    if enabled("reaction"):
        lines.append("支座反力")
        reactions = _sorted_items(result.reactions)
        if not reactions:
            lines.append("- 未形成支座反力。")
        for node_id, values in reactions:
            lines.append(
                f"- {node_id}: Fx={_fmt(values.get('fx', 0.0) / 1000)} kN，"
                f"Fy={_fmt(values.get('fy', 0.0) / 1000)} kN，"
                f"Mz={_fmt(values.get('mz', 0.0) / 1000)} kN·m"
            )
        lines.append("")

    if enabled("internal"):
        lines.append("杆端内力")
        for element_id, values in _sorted_items(result.element_end_forces):
            lines.append(
                f"- {element_id}: Ni={_fmt(values.get('n_i', 0.0) / 1000)} kN，"
                f"Vi={_fmt(values.get('v_i', 0.0) / 1000)} kN，"
                f"Mi={_fmt(values.get('m_i', 0.0) / 1000)} kN·m；"
                f"Nj={_fmt(values.get('n_j', 0.0) / 1000)} kN，"
                f"Vj={_fmt(values.get('v_j', 0.0) / 1000)} kN，"
                f"Mj={_fmt(values.get('m_j', 0.0) / 1000)} kN·m"
            )
        lines.append("")

    extrema_specs = []
    if enabled("shear"):
        extrema_specs.append(("剪力 V", "v", 1 / 1000, "kN"))
    if enabled("moment"):
        extrema_specs.append(("弯矩 M", "m", 1 / 1000, "kN·m"))
    if enabled("axial"):
        extrema_specs.append(("轴力 N", "n", 1 / 1000, "kN"))
    if extrema_specs:
        lines.append("内力图极值")
        for label, component, scale, unit in extrema_specs:
            extrema = _diagram_extrema(result, component, scale)
            if extrema is None:
                lines.append(f"- {label}: 暂无可用数据。")
                continue
            maximum, minimum = extrema
            lines.append(
                f"- {label}: 最大 {_fmt(maximum['value'])} {unit}（{maximum['element']}, x={_fmt(maximum['x'])} m），"
                f"最小 {_fmt(minimum['value'])} {unit}（{minimum['element']}, x={_fmt(minimum['x'])} m）"
            )
        lines.append("")

    if enabled("stress") or enabled("strain") or enabled("stress_strain"):
        _append_stress_strain(lines, project, result, enabled)

    if enabled("danger"):
        dangerous = result.summary.get("dangerous_sections", [])
        lines.append("危险截面")
        if not dangerous:
            lines.append("- 未识别到可报告的危险截面。")
        for item in dangerous[:3]:
            lines.append(
                f"- {item.get('element', '?')}: x={_fmt(item.get('x', 0.0))} m，"
                f"|M|={_fmt(abs(float(item.get('moment', 0.0))) / 1000)} kN·m"
            )
        lines.append("")

    if enabled("flexibility"):
        flexibility = result.summary.get("load_point_flexibility", [])
        lines.append("柔度")
        if not flexibility:
            lines.append("- 当前荷载点没有可计算的柔度结果。")
        for item in flexibility:
            unit = "rad/(N·m)" if item.get("kind") == "rotation" else "m/N"
            lines.append(
                f"- {item.get('node', '?')}: 荷载={_fmt(item.get('load', 0.0))}，"
                f"响应={_fmt(item.get('displacement', 0.0))}，"
                f"柔度={_fmt(item.get('flexibility', 0.0))} {unit}"
            )
        lines.append("")

    lines.extend(
        [
            "控制方程与符号",
            "- 总体平衡方程：[K]{u}={P}",
            "- 单元坐标变换：[k_e]=[T]^T[k'_e][T]",
            "- 支座反力：{R}=[K]{u}-{P}",
            "- 杆端内力：{f'_e}=[k'_e]{u'_e}-{p'_e}",
            "",
            "计算推导过程",
            "1. 将界面输入统一换算到 SI 单位：力 N、长度 m、弹性模量 Pa、截面面积 m²、惯性矩 m⁴。",
            "2. 普通梁柱建立二维梁柱单元局部刚度矩阵；桁架杆只保留轴向刚度；端部铰接通过静力凝聚释放弯矩自由度。",
            "3. 用方向余弦构造坐标转换矩阵 T，并按 k=Tᵀk'T 转换到全局坐标系。",
            "4. 将集中荷载和分布荷载换算为等效节点荷载，组装总体方程 [K]{u}={P}。",
            "5. 按支座约束消去受限自由度，求得节点位移 ux、uy 和转角 θ。",
            "6. 由 {R}=[K]{u}-{P} 得到支座反力，由杆端位移反算 Ni、Vi、Mi、Nj、Vj、Mj，并沿杆长生成 N/V/M 数据。",
        ]
    )
    if enabled("stress") or enabled("strain") or enabled("stress_strain"):
        lines.append("7. 组合正应力按 σ=N/A+M·c/I 估算，应变按 ε=σ/E 计算；当前 c 采用等效截面值 sqrt(A)/2。")
    _append_static_conclusion(lines, result)
    return "\n".join(lines).rstrip() + "\n"


def build_report_pdf(
    project: Project,
    result: AnalysisResult,
    *,
    images: dict[str, Any] | None = None,
    options: list[str] | None = None,
) -> bytes:
    return build_text_report_pdf(build_report_text(project, result, options=options), images=images)


def build_text_report_pdf(
    text: str,
    *,
    images: dict[str, Any] | None = None,
    title: str = "计算力学求解计算书",
) -> bytes:
    """Build a readable Chinese PDF with structured sections and optional figures."""

    regular_font, bold_font = _register_report_fonts()
    styles = _report_styles(regular_font, bold_font)
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=18 * mm,
        title=title,
        author="Li+ Studio",
        subject="Computational Mechanics Solver calculation report",
        pageCompression=1,
    )
    story = _report_story(text, styles)
    for image_title, data in _report_images(images):
        story.extend([PageBreak(), Paragraph(escape(image_title), styles["heading"]), Spacer(1, 4 * mm)])
        reader = ImageReader(BytesIO(data))
        width, height = reader.getSize()
        scale = min((A4[0] - 40 * mm) / width, (A4[1] - 62 * mm) / height)
        story.append(ReportImage(BytesIO(data), width=width * scale, height=height * scale))
        story.append(Spacer(1, 3 * mm))
        story.append(Paragraph("图示为求解时的画布视图，仅用于结果说明。", styles["caption"]))

    def draw_page(canvas: Any, doc: Any) -> None:
        canvas.saveState()
        canvas.setTitle(title)
        canvas.setAuthor("Li+ Studio")
        canvas.setFont(regular_font, 8)
        canvas.setFillColor(colors.HexColor("#5B6472"))
        canvas.drawString(20 * mm, 10 * mm, "Computational Mechanics Solver")
        canvas.drawRightString(A4[0] - 20 * mm, 10 * mm, f"第 {doc.page} 页")
        canvas.restoreState()

    document.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    return buffer.getvalue()


def _append_static_model_inputs(lines: list[str], project: Project) -> None:
    lines.append("模型输入")
    for material in project.materials:
        lines.append(
            f"- 材料 {material.id}: E={_fmt(material.elastic_modulus / 1e9)} GPa，"
            f"泊松比={_fmt(material.poisson_ratio)}"
        )
    for section in project.sections:
        lines.append(
            f"- 截面 {section.id}: A={_fmt(section.area * 1e6)} mm²，"
            f"I={_fmt(section.inertia * 1e12)} mm⁴"
        )
    for node in project.nodes:
        restrained = [name for name, active in zip(("ux", "uy", "rz"), node.restraints) if active]
        lines.append(
            f"- 节点 {node.id}: x={_fmt(node.x)} m，y={_fmt(node.y)} m，"
            f"约束={','.join(restrained) if restrained else '无'}"
        )
    for element in project.elements:
        releases = []
        if element.moment_release_i:
            releases.append("i 端弯矩释放")
        if element.moment_release_j:
            releases.append("j 端弯矩释放")
        lines.append(
            f"- 杆件 {element.id}: {element.node_i}->{element.node_j}，类型={element.type}，"
            f"材料={element.material}，截面={element.section}，端部释放={'、'.join(releases) if releases else '无'}"
        )
    for load in project.nodal_loads:
        lines.append(
            f"- 节点荷载 {load.node}: Fx={_fmt(load.fx / 1000)} kN，"
            f"Fy={_fmt(load.fy / 1000)} kN，Mz={_fmt(load.mz / 1000)} kN·m"
        )
    for load in project.element_loads:
        lines.append(f"- 杆件荷载 {load.element}: {_element_load_description(load)}")
    lines.append("")


def _element_load_description(load: ElementLoad) -> str:
    if load.kind == "point_global":
        return (
            f"类型=杆中集中作用，位置比例={_fmt(load.ratio)}，"
            f"Fx={_fmt(load.fx / 1000)} kN，Fy={_fmt(load.fy / 1000)} kN，"
            f"Mz={_fmt(load.mz / 1000)} kN·m"
        )
    if load.kind == "uniform_local":
        return (
            f"类型=局部坐标均布荷载，qx={_fmt(load.qx / 1000)} kN/m，"
            f"qy={_fmt(load.qy / 1000)} kN/m"
        )
    if load.kind == "linear_local":
        qx_i = load.qx if load.qx_i is None else load.qx_i
        qx_j = qx_i if load.qx_j is None else load.qx_j
        qy_i = load.qy if load.qy_i is None else load.qy_i
        qy_j = qy_i if load.qy_j is None else load.qy_j
        return (
            f"类型=局部坐标线性分布荷载，qx(i/j)={_fmt(qx_i / 1000)}/{_fmt(qx_j / 1000)} kN/m，"
            f"qy(i/j)={_fmt(qy_i / 1000)}/{_fmt(qy_j / 1000)} kN/m"
        )
    if load.kind == "uniform_moment_local":
        return f"类型=局部坐标均布力偶，m={_fmt(load.mz / 1000)} kN·m/m（逆时针为正）"
    if load.kind == "polynomial_local":
        qx = ", ".join(_fmt(value / 1000) for value in load.qx_coefficients) or "0"
        qy = ", ".join(_fmt(value / 1000) for value in load.qy_coefficients) or "0"
        return f"类型=局部坐标多项式分布荷载，qx 系数=[{qx}] kN/m，qy 系数=[{qy}] kN/m"
    return f"类型={load.kind}"


def _append_static_conclusion(lines: list[str], result: AnalysisResult) -> None:
    displacements: list[tuple[str, float, dict[str, float]]] = []
    for node_id, values in result.displacements.items():
        magnitude = math.hypot(float(values.get("ux", 0.0)), float(values.get("uy", 0.0)))
        displacements.append((node_id, magnitude, values))
    diagram_points: list[tuple[str, dict[str, float]]] = []
    for element_id, rows in result.element_diagrams.items():
        diagram_points.extend((element_id, row) for row in rows)

    lines.extend(["", "计算结论"])
    if displacements:
        node_id, magnitude, values = max(displacements, key=lambda item: item[1])
        lines.append(
            f"- 最大节点平动位移出现在 {node_id}: |u|={_fmt(magnitude * 1000)} mm，"
            f"ux={_fmt(values.get('ux', 0.0) * 1000)} mm，uy={_fmt(values.get('uy', 0.0) * 1000)} mm。"
        )
    if diagram_points:
        moment_element, moment_row = max(diagram_points, key=lambda item: abs(float(item[1].get("m", 0.0))))
        shear_element, shear_row = max(diagram_points, key=lambda item: abs(float(item[1].get("v", 0.0))))
        axial_element, axial_row = max(diagram_points, key=lambda item: abs(float(item[1].get("n", 0.0))))
        lines.append(
            f"- 最大绝对弯矩：|M|={_fmt(abs(float(moment_row.get('m', 0.0))) / 1000)} kN·m，"
            f"位于 {moment_element} 的 x={_fmt(moment_row.get('x', 0.0))} m。"
        )
        lines.append(
            f"- 最大绝对剪力：|V|={_fmt(abs(float(shear_row.get('v', 0.0))) / 1000)} kN；"
            f"最大绝对轴力：|N|={_fmt(abs(float(axial_row.get('n', 0.0))) / 1000)} kN。"
        )
    lines.append("- 以上结论基于当前二维线弹性、小变形模型；工程使用前应以解析解或成熟软件独立复核。")


def _register_report_fonts() -> tuple[str, str]:
    global _REPORT_FONT_NAMES
    if _REPORT_FONT_NAMES is not None:
        return _REPORT_FONT_NAMES

    candidates = [
        (Path("C:/Windows/Fonts/Deng.ttf"), Path("C:/Windows/Fonts/Dengb.ttf")),
        (Path("C:/Windows/Fonts/msyh.ttc"), Path("C:/Windows/Fonts/msyhbd.ttc")),
        (Path("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"), None),
        (Path("/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf"), None),
        (Path("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"), None),
    ]
    for regular_path, bold_path in candidates:
        if not regular_path.is_file():
            continue
        try:
            pdfmetrics.registerFont(TTFont("CMSReportCJK", str(regular_path)))
            bold_name = "CMSReportCJK"
            if bold_path is not None and bold_path.is_file():
                pdfmetrics.registerFont(TTFont("CMSReportCJKBold", str(bold_path)))
                bold_name = "CMSReportCJKBold"
            pdfmetrics.registerFontFamily(
                "CMSReportCJK",
                normal="CMSReportCJK",
                bold=bold_name,
                italic="CMSReportCJK",
                boldItalic=bold_name,
            )
            _REPORT_FONT_NAMES = ("CMSReportCJK", bold_name)
            return _REPORT_FONT_NAMES
        except Exception:  # noqa: BLE001 - continue through known system font candidates.
            continue

    if "STSong-Light" not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
    _REPORT_FONT_NAMES = ("STSong-Light", "STSong-Light")
    return _REPORT_FONT_NAMES


def _report_styles(regular_font: str, bold_font: str) -> dict[str, ParagraphStyle]:
    sample = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ReportTitle",
            parent=sample["Title"],
            fontName=bold_font,
            fontSize=20,
            leading=28,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#163A4A"),
            spaceAfter=10 * mm,
            wordWrap="CJK",
        ),
        "heading": ParagraphStyle(
            "ReportHeading",
            parent=sample["Heading1"],
            fontName=bold_font,
            fontSize=14,
            leading=21,
            textColor=colors.HexColor("#0D7D79"),
            spaceBefore=5 * mm,
            spaceAfter=2.5 * mm,
            keepWithNext=True,
            wordWrap="CJK",
        ),
        "subheading": ParagraphStyle(
            "ReportSubheading",
            parent=sample["Heading2"],
            fontName=bold_font,
            fontSize=11.5,
            leading=17,
            textColor=colors.HexColor("#263B47"),
            spaceBefore=3 * mm,
            spaceAfter=1.5 * mm,
            keepWithNext=True,
            wordWrap="CJK",
        ),
        "body": ParagraphStyle(
            "ReportBody",
            parent=sample["BodyText"],
            fontName=regular_font,
            fontSize=9.5,
            leading=15,
            textColor=colors.HexColor("#202A31"),
            spaceAfter=1.4 * mm,
            wordWrap="CJK",
        ),
        "bullet": ParagraphStyle(
            "ReportBullet",
            parent=sample["BodyText"],
            fontName=regular_font,
            fontSize=9.3,
            leading=14.5,
            leftIndent=5 * mm,
            firstLineIndent=-3 * mm,
            bulletIndent=1.5 * mm,
            textColor=colors.HexColor("#202A31"),
            spaceAfter=1.2 * mm,
            wordWrap="CJK",
        ),
        "step": ParagraphStyle(
            "ReportStep",
            parent=sample["BodyText"],
            fontName=regular_font,
            fontSize=9.3,
            leading=14.5,
            leftIndent=5 * mm,
            firstLineIndent=-5 * mm,
            textColor=colors.HexColor("#202A31"),
            spaceAfter=1.4 * mm,
            wordWrap="CJK",
        ),
        "formula": ParagraphStyle(
            "ReportFormula",
            parent=sample["Code"],
            fontName=regular_font,
            fontSize=9.2,
            leading=14,
            leftIndent=5 * mm,
            rightIndent=5 * mm,
            borderColor=colors.HexColor("#B8D9D6"),
            borderWidth=0.5,
            borderPadding=5,
            backColor=colors.HexColor("#F2F8F7"),
            textColor=colors.HexColor("#17343F"),
            spaceBefore=1.5 * mm,
            spaceAfter=2 * mm,
            wordWrap="CJK",
        ),
        "caption": ParagraphStyle(
            "ReportCaption",
            parent=sample["BodyText"],
            fontName=regular_font,
            fontSize=8.5,
            leading=13,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#66727A"),
            wordWrap="CJK",
        ),
    }


def _report_story(text: str, styles: dict[str, ParagraphStyle]) -> list[Any]:
    story: list[Any] = []
    first_content = True
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            story.append(Spacer(1, 2.2 * mm))
            continue
        safe_line = escape(line)
        if first_content:
            story.append(Paragraph(safe_line, styles["title"]))
            first_content = False
        elif line in REPORT_SECTION_HEADINGS:
            story.append(Paragraph(safe_line, styles["heading"]))
        elif line.endswith("：") and len(line) <= 40 and "=" not in line:
            story.append(Paragraph(safe_line, styles["subheading"]))
        elif line.startswith("- "):
            content = escape(line[2:])
            style = styles["formula"] if _looks_like_formula(line) else styles["bullet"]
            story.append(Paragraph(content, style, bulletText=None if style is styles["formula"] else "•"))
        elif re.match(r"^\d+[.、]", line):
            story.append(Paragraph(safe_line, styles["step"]))
        elif _looks_like_formula(line):
            story.append(Paragraph(safe_line, styles["formula"]))
        else:
            story.append(Paragraph(safe_line, styles["body"]))
    return story or [Paragraph("暂无可报告内容。", styles["body"])]


def _looks_like_formula(line: str) -> bool:
    formula_tokens = (
        "[K]",
        "[k_e]",
        "[k'_e]",
        "{u}",
        "{P}",
        "{R}",
        "{f'_e}",
        "Δv=",
        "F=",
        "m·a",
        "k1",
        "k2",
        "k3",
        "k4",
        "x(t)",
        "y(t)",
        "σ=",
        "ε=",
    )
    return any(token in line for token in formula_tokens)


def _append_diagnostics(lines: list[str], diagnostics: Any) -> None:
    if not isinstance(diagnostics, dict):
        return
    lines.extend(
        [
            "模型诊断",
            f"- 节点数：{diagnostics.get('node_count', 0)}",
            f"- 单元数：{diagnostics.get('element_count', 0)}",
            f"- 约束自由度数：{diagnostics.get('restrained_dof_count', 0)}",
            f"- 自由自由度数：{diagnostics.get('free_dof_count', 0)}",
            f"- 静定指数：{diagnostics.get('determinacy_index', 0)}",
        ]
    )
    issues = diagnostics.get("issues", [])
    if not issues:
        lines.append("- 提示：未发现拓扑级诊断问题。")
    for issue in issues:
        if not isinstance(issue, dict):
            continue
        level = {"error": "错误", "warning": "警告", "info": "信息"}.get(issue.get("level"), "信息")
        message = DIAGNOSTIC_MESSAGES.get(str(issue.get("code")), str(issue.get("message", "未知诊断信息。")))
        lines.append(f"- [{level}] {message}")
    lines.append("")


def _append_stress_strain(
    lines: list[str],
    project: Project,
    result: AnalysisResult,
    enabled: Any,
) -> None:
    elements = {element.id: element for element in project.elements}
    sections = {section.id: section for section in project.sections}
    materials = {material.id: material for material in project.materials}
    rows: list[dict[str, float | str]] = []
    for element_id, diagram in result.element_diagrams.items():
        element = elements.get(element_id)
        if element is None:
            continue
        section = sections.get(element.section)
        material = materials.get(element.material)
        if section is None or material is None:
            continue
        c = math.sqrt(max(section.area, 1e-30)) / 2
        for row in diagram:
            stress = float(row.get("n", 0.0)) / max(section.area, 1e-30)
            stress += float(row.get("m", 0.0)) * c / max(section.inertia, 1e-30)
            rows.append(
                {
                    "element": element_id,
                    "x": float(row.get("x", 0.0)),
                    "stress": stress,
                    "strain": stress / max(material.elastic_modulus, 1e-30),
                }
            )
    lines.append("应力与应变")
    if not rows:
        lines.append("- 暂无可用数据。")
        lines.append("")
        return
    max_stress = max(rows, key=lambda item: abs(float(item["stress"])))
    max_strain = max(rows, key=lambda item: abs(float(item["strain"])))
    if enabled("stress") or enabled("stress_strain"):
        lines.append(
            f"- 最大组合正应力估算：{_fmt(float(max_stress['stress']) / 1e6)} MPa"
            f"（{max_stress['element']}, x={_fmt(max_stress['x'])} m）"
        )
    if enabled("strain") or enabled("stress_strain"):
        lines.append(
            f"- 最大应变：{_fmt(float(max_strain['strain']) * 1e6)} με"
            f"（{max_strain['element']}, x={_fmt(max_strain['x'])} m）"
        )
    lines.append("")


def _system_judgement(project: Project, result: AnalysisResult | None = None) -> str:
    system = (result.summary if result is not None else {}).get("system")
    if isinstance(system, dict) and "degrees_of_freedom" in system:
        freedom = int(system["degrees_of_freedom"])
        count = (
            f"W = 3×{system.get('joints', 0)} − 3×{system.get('members', 0)}"
            f" + {system.get('hinged_connections', 0)} − {system.get('restraints', 0)}"
            f" − {system.get('pin_joints', 0)} = {freedom}"
        )
        if system.get("classification") == "unstable":
            return f"几何可变体系（常变），{count}"
        if system.get("classification") == "determinate":
            return f"几何不变、静定结构（刚度矩阵满秩），{count}"
        return f"几何不变、{int(system.get('indeterminacy', 0))} 次超静定结构（刚度矩阵满秩），{count}"
    restrained = sum(sum(node.restraints) for node in project.nodes)
    if not project.nodes or not project.elements:
        return "未形成结构"
    if restrained < 3:
        return "常变或瞬变风险：约束自由度少于 3"
    if restrained == 3:
        return "外部静定近似，不变体系需结合几何继续判断"
    return f"外部超静定近似，冗余约束约 {restrained - 3}"


def _diagram_extrema(
    result: AnalysisResult, component: str, scale: float
) -> tuple[dict[str, float | str], dict[str, float | str]] | None:
    points: list[dict[str, float | str]] = []
    for element_id, rows in result.element_diagrams.items():
        for row in rows:
            points.append(
                {
                    "element": element_id,
                    "x": float(row.get("x", 0.0)),
                    "value": float(row.get(component, 0.0)) * scale,
                }
            )
    if not points:
        return None
    return max(points, key=lambda item: float(item["value"])), min(
        points, key=lambda item: float(item["value"])
    )


def _sorted_items(values: dict[str, Any]) -> list[tuple[str, Any]]:
    def key(item: tuple[str, Any]) -> tuple[str, int]:
        match = re.match(r"^(.*?)(\d+)$", item[0])
        return (match.group(1), int(match.group(2))) if match else (item[0], 0)

    return sorted(values.items(), key=key)


def _fmt(value: Any) -> str:
    numeric = float(value or 0.0)
    if not math.isfinite(numeric) or abs(numeric) < 1e-12:
        return "0"
    magnitude = abs(numeric)
    if magnitude >= 1e6 or magnitude < 1e-5:
        return f"{numeric:.4e}"
    return f"{numeric:.6f}".rstrip("0").rstrip(".")


def _report_images(images: dict[str, Any] | None) -> list[tuple[str, bytes]]:
    if not isinstance(images, dict):
        return []
    result: list[tuple[str, bytes]] = []
    for key, title in (("model", "模型视图"), ("diagrams", "所选结果图")):
        data_url = images.get(key)
        if not data_url:
            continue
        try:
            mime_type, data = _decode_data_url(str(data_url))
            if mime_type in {"image/jpeg", "image/png"}:
                width, height = ImageReader(BytesIO(data)).getSize()
                if width <= 0 or height <= 0:
                    raise ValueError("Invalid image dimensions")
                result.append((title, data))
        except (ValueError, OSError, binascii.Error):
            continue
    return result


def _decode_data_url(data_url: str) -> tuple[str, bytes]:
    prefix, separator, payload = data_url.partition(",")
    if not separator or ";base64" not in prefix:
        raise ValueError("Unsupported image data URL")
    mime_type = prefix.removeprefix("data:").split(";")[0].lower()
    return mime_type, base64.b64decode(payload, validate=True)
