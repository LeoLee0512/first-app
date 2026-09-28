"""Body-size and payload checks on the solver / report POST endpoints."""

import json
import socket
import sys
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

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


if __name__ == "__main__":
    unittest.main()
