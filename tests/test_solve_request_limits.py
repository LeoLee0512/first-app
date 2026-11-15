"""Body-size and payload checks on the solver / report POST endpoints."""

import json
import socket
import sys
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from unittest.mock import patch

from mechanics_mvp.models import Element, Material, Node, Project, Section
from mechanics_mvp.preprocess import MAX_SOLVE_DOFS, MAX_SOLVE_NODES, ValidationError, validate_project
from mechanics_mvp.solver import Frame2DSolver
from mechanics_mvp.webapp import SOLVER_BODY_LIMIT, MechanicsWebHandler


class SolveRequestLimitTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), MechanicsWebHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.host, cls.port = cls.server.server_address[:2]

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def raw_post(self, path: str, body: bytes, content_length: str | None = None, extra_headers: str = ""):
        length = str(len(body)) if content_length is None else content_length
        request = (
            f"POST {path} HTTP/1.0\r\n"
            f"Host: {self.host}\r\n"
            "Content-Type: application/json\r\n"
            f"Content-Length: {length}\r\n"
            f"{extra_headers}"
            "\r\n"
        ).encode("ascii") + body
        with socket.create_connection((self.host, self.port), timeout=5) as connection:
            connection.sendall(request)
            chunks = []
            while True:
                data = connection.recv(65536)
                if not data:
                    break
                chunks.append(data)
        response = b"".join(chunks)
        head, _, payload = response.partition(b"\r\n\r\n")
        status = int(head.split(b" ", 2)[1])
        return status, json.loads(payload.decode("utf-8")) if payload else None

    def test_limit_is_sixteen_megabytes(self):
        self.assertEqual(SOLVER_BODY_LIMIT, 16 * 1024 * 1024)

    def test_oversized_content_length_is_rejected_with_413_before_reading(self):
        for path in ("/api/solve", "/api/report", "/api/dynamics-report"):
            with self.subTest(path=path):
                status, payload = self.raw_post(path, b"{}", content_length=str(SOLVER_BODY_LIMIT + 1))
                self.assertEqual(status, 413)
                self.assertIn("过大", payload["error"])

    def test_invalid_content_length_is_rejected_with_400(self):
        for value in ("abc", "-5"):
            with self.subTest(value=value):
                status, payload = self.raw_post("/api/solve", b"{}", content_length=value)
                self.assertEqual(status, 400)
                self.assertIn("长度无效", payload["error"])

    def test_chunked_upload_is_rejected_with_400(self):
        status, payload = self.raw_post("/api/solve", b"{}", extra_headers="Transfer-Encoding: chunked\r\n")
        self.assertEqual(status, 400)
        self.assertIn("分块", payload["error"])

    def test_non_object_json_is_rejected_with_422(self):
        for body in (b"[1, 2, 3]", b"42", b'"text"'):
            with self.subTest(body=body):
                status, payload = self.raw_post("/api/solve", body)
                self.assertEqual(status, 422)
                self.assertIn("JSON 对象", payload["error"])

    def test_malformed_json_is_rejected_with_422(self):
        status, payload = self.raw_post("/api/solve", b"{not json")
        self.assertEqual(status, 422)
        self.assertIn("JSON", payload["error"])

    def test_valid_project_still_solves(self):
        project = {
            "materials": [{"id": "steel", "E": "200 GPa"}],
            "sections": [{"id": "default", "A": "10000 mm^2", "I": "80000000 mm^4"}],
            "nodes": [
                {"id": "N1", "x": "0 m", "y": "0 m", "restraints": ["ux", "uy", "rz"]},
                {"id": "N2", "x": "2 m", "y": "0 m"},
            ],
            "elements": [{"id": "E1", "node_i": "N1", "node_j": "N2", "material": "steel", "section": "default"}],
            "loads": {"nodes": [{"node": "N2", "fy": "-10 kN"}]},
        }
        status, payload = self.raw_post("/api/solve", json.dumps(project).encode("utf-8"))
        self.assertEqual(status, 200)
        self.assertAlmostEqual(payload["reactions"]["N1"]["fy"], 10_000.0)
        self.assertEqual(payload["summary"]["system"]["classification"], "determinate")

    def _oversized_project(self) -> dict:
        nodes = [
            {
                "id": f"N{index}",
                "x": f"{index} m",
                "y": "0 m",
                "restraints": ["ux", "uy", "rz"] if index == 0 else [],
            }
            for index in range(MAX_SOLVE_NODES + 1)
        ]
        return {
            "materials": [{"id": "steel", "E": "200 GPa"}],
            "sections": [{"id": "default", "A": "10000 mm^2", "I": "80000000 mm^4"}],
            "nodes": nodes,
            "elements": [{"id": "E1", "node_i": "N0", "node_j": "N1", "material": "steel", "section": "default"}],
            "loads": {"nodes": [{"node": "N1", "fy": "-1 kN"}]},
        }

    def test_solve_and_report_reject_models_above_the_node_cap(self):
        body = json.dumps(self._oversized_project()).encode("utf-8")
        for path in ("/api/solve", "/api/report"):
            with self.subTest(path=path):
                status, payload = self.raw_post(path, body)
                self.assertEqual(status, 422)
                self.assertIn(str(MAX_SOLVE_NODES), payload["error"])
                self.assertIn(str(MAX_SOLVE_DOFS), payload["error"])
                self.assertIn("3N×3N", payload["error"])

    def test_cap_is_enforced_before_the_dense_matrices_are_allocated(self):
        nodes = tuple(
            Node(f"N{index}", float(index), 0.0, (True, True, True) if index == 0 else (False, False, False))
            for index in range(MAX_SOLVE_NODES + 1)
        )
        project = Project(
            nodes=nodes,
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(Element("E1", "N0", "N1", "steel", "section"),),
        )
        with patch("mechanics_mvp.solver.np.zeros") as zeros:
            with self.assertRaises(ValidationError) as captured:
                Frame2DSolver().solve(project)
        zeros.assert_not_called()
        self.assertIn(str(MAX_SOLVE_NODES), str(captured.exception))
        self.assertIn(str(MAX_SOLVE_DOFS), str(captured.exception))

    def test_a_real_frame_at_the_cap_is_not_refused_for_size(self):
        nodes = tuple(Node(f"N{index}", float(index), 0.0, (True, True, True)) for index in range(MAX_SOLVE_NODES))
        project = Project(
            nodes=nodes,
            materials=(Material("steel", 200e9),),
            sections=(Section("section", 0.01, 8e-5),),
            elements=(Element("E1", "N0", "N1", "steel", "section"),),
        )
        with self.assertRaises(ValidationError) as captured:
            validate_project(project)
        self.assertNotIn("求解规模上限", str(captured.exception))


if __name__ == "__main__":
    unittest.main()
