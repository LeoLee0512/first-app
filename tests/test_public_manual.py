from __future__ import annotations

import re
import unittest
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
MANUAL_DIR = ROOT / "docs" / "manual" / "v1.5.1"
PDF_PATH = ROOT / "web" / "downloads" / "computational-mechanics-solver-v1.5.1-manual.pdf"
SOURCE_PATH = MANUAL_DIR / "manual-source.md"


class PublicManualTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source_text = SOURCE_PATH.read_text(encoding="utf-8")
        cls.pdf_reader = PdfReader(PDF_PATH)
        cls.pdf_text = "\n".join(
            page.extract_text() or "" for page in cls.pdf_reader.pages
        )

    def test_public_outputs_exist_and_are_substantial(self) -> None:
        self.assertGreater(SOURCE_PATH.stat().st_size, 15_000)
        self.assertGreater(PDF_PATH.stat().st_size, 500_000)
        self.assertGreaterEqual(len(self.pdf_reader.pages), 20)
        self.assertGreater(len(self.pdf_text), 15_000)

    def test_repository_keeps_one_source_and_no_generated_docx(self) -> None:
        self.assertEqual(list(MANUAL_DIR.glob("*.docx")), [])
        self.assertIn("Computational Mechanics Solver v1.5.1 用户与技术说明书", self.source_text)
        self.assertIn("含斜支座、端铰与混合杆件的多跨平面刚架", self.source_text)
        self.assertIn("二维刚体圆盘接触与碰撞", self.source_text)
        self.assertIn("斜坡实心圆盘无滑动滚动", self.source_text)
        referenced_images = re.findall(r"\]\((assets/[^)]+)\)", self.source_text)
        self.assertEqual(
            sorted(referenced_images),
            sorted(
                [
                    "assets/welcome-v1.5.1.png",
                    "assets/static-portal-frame-v1.5.1.png",
                    "assets/dynamics-collision-v1.5.1.png",
                    "assets/dynamics-track-rolling-v1.5.1.png",
                    "assets/dynamics-variable-field-v1.5.1.png",
                ]
            ),
        )
        for image in referenced_images:
            self.assertTrue((MANUAL_DIR / image).is_file(), image)

    def test_pdf_contains_required_user_facing_content(self) -> None:
        required = (
            "Computational Mechanics Solver v1.5.1",
            "第一章 阅读本手册",
            "第七章 静力学案例",
            "第十二章 动力学案例",
            "含斜支座、端铰与混合杆件的多跨平面刚架",
            "二维刚体圆盘接触与碰撞",
            "斜坡实心圆盘无滑动滚动",
            "0.996937",
            "22.323607",
            "9.7176",
            "Euler-Bernoulli",
            "Runge-Kutta",
        )
        for text in required:
            with self.subTest(text=text):
                self.assertIn(text, self.pdf_text)

    def test_public_document_does_not_leak_internal_release_details(self) -> None:
        forbidden = (
            "Git",
            "/api/",
            "SHA256",
            "ThreadingHTTPServer",
            "源码 ZIP",
            "release/v1.3.2",
            "git_commit",
            "git_dirty",
            "started_at",
        )
        for text in forbidden:
            with self.subTest(text=text):
                self.assertNotIn(text, self.pdf_text)
                self.assertNotIn(text, self.source_text)

        self.assertIsNone(re.search(r"[A-Za-z]:\\Users\\", self.pdf_text))
        self.assertIsNone(re.search(r"[A-Za-z]:\\Users\\", self.source_text))
        self.assertNotIn("\ufffd", self.pdf_text)

    def test_only_one_public_manual_pdf_exists(self) -> None:
        manuals = list(ROOT.rglob("computational-mechanics-solver-*-manual.pdf"))
        self.assertEqual(manuals, [PDF_PATH])
        self.assertEqual(PDF_PATH.read_bytes()[:4], b"%PDF")


if __name__ == "__main__":
    unittest.main()
