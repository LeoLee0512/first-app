import json
import sys
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.webapp import MechanicsWebHandler


class PointGlobalWebAppTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), MechanicsWebHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base_url = f"http://127.0.0.1:{cls.server.server_address[1]}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def request_json(self, path, payload=None):
        if payload is None:
            request = Request(f"{self.base_url}{path}")
        else:
            request = Request(
                f"{self.base_url}{path}",
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
        with urlopen(request, timeout=5) as response:
            return response.status, response.headers, response.read()

    @staticmethod
    def simply_supported_payload():
        return {
            "materials": [{"id": "steel", "E": "200 GPa"}],
            "sections": [{"id": "default", "A": "10000 mm^2", "I": "80000000 mm^4"}],
            "nodes": [
                {"id": "N1", "x": "0 m", "y": "0 m", "restraints": ["ux", "uy"]},
                {"id": "N2", "x": "4 m", "y": "0 m", "restraints": ["uy"]},
            ],
            "elements": [
                {
                    "id": "E1",
                    "node_i": "N1",
                    "node_j": "N2",
                    "material": "steel",
                    "section": "default",
                    "type": "frame",
                }
            ],
            "loads": {
                "nodes": [{"node": "N2", "fy": "-10 kN"}],
                "elements": [
                    {
                        "element": "E1",
                        "kind": "point_global",
                        "ratio": 0.5,
                        "fx": "0 N",
                        "fy": "-10 kN",
                        "mz": "0 N*m",
                    }
                ],
            },
        }

    def test_point_global_solve_through_http_api(self):
        status, _, body = self.request_json("/api/solve", self.simply_supported_payload())
        result = json.loads(body.decode("utf-8"))

        self.assertEqual(status, 200)
        self.assertNotIn("error", result)
        self.assertAlmostEqual(result["reactions"]["N1"]["fy"], 5_000.0, places=6)
        self.assertAlmostEqual(result["reactions"]["N2"]["fy"], 15_000.0, places=6)
        self.assertAlmostEqual(
            result["reactions"]["N1"]["fy"] + result["reactions"]["N2"]["fy"],
            20_000.0,
            places=6,
        )
        self.assertIn("E1", result["element_end_forces"])
        self.assertIn("E1", result["element_diagrams"])
        diagram = result["element_diagrams"]["E1"]
        self.assertTrue(any(abs(point["m"]) > 1e-9 for point in diagram))
        self.assertAlmostEqual(max(abs(point["m"]) for point in diagram), 10_000.0, places=5)

    def test_point_global_report_through_http_api(self):
        status, headers, body = self.request_json("/api/report", self.simply_supported_payload())

        self.assertEqual(status, 200)
        self.assertEqual(headers.get_content_type(), "application/pdf")
        self.assertTrue(body.startswith(b"%PDF-1.4"))

    def test_multiple_point_global_loads_are_accumulated(self):
        payload = self.simply_supported_payload()
        payload["loads"] = {
            "elements": [
                {"element": "E1", "kind": "point_global", "ratio": 0.25, "fy": "-4 kN"},
                {"element": "E1", "kind": "point_global", "ratio": 0.75, "fy": "-6 kN"},
            ]
        }

        status, _, body = self.request_json("/api/solve", payload)
        result = json.loads(body.decode("utf-8"))

        self.assertEqual(status, 200)
        self.assertAlmostEqual(result["reactions"]["N1"]["fy"], 4_500.0, places=6)
        self.assertAlmostEqual(result["reactions"]["N2"]["fy"], 5_500.0, places=6)
        self.assertAlmostEqual(
            result["reactions"]["N1"]["fy"] + result["reactions"]["N2"]["fy"],
            10_000.0,
            places=6,
        )

    def test_version_endpoint_exposes_only_public_runtime_identity(self):
        status, _, body = self.request_json("/api/version")
        payload = json.loads(body.decode("utf-8"))

        self.assertEqual(status, 200)
        self.assertEqual(payload["application"], "computational-mechanics-solver")
        self.assertEqual(payload["version"], "1.5.1")
        self.assertIsInstance(payload["git_dirty"], bool)
        self.assertRegex(payload["started_at"], r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
        self.assertEqual(payload["schema_static"], "cms-static-project@1")
        self.assertEqual(payload["schema_dynamics"], "cms-dynamics-project@2")
        self.assertTrue(payload["python_version"])
        self.assertTrue(payload["git_commit"])
        self.assertNotIn(str(Path.home()), json.dumps(payload))


if __name__ == "__main__":
    unittest.main()
