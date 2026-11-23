import sys
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.webapp import MANUAL_FILE, MechanicsWebHandler


class ManualDownloadTests(unittest.TestCase):
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

    def test_fixed_manual_endpoint_returns_exact_pdf_as_attachment(self):
        url = f"{self.base_url}/downloads/computational-mechanics-solver-v1.5.1-manual.pdf?source=test"
        with urlopen(url, timeout=10) as response:
            body = response.read()

        self.assertEqual(response.status, 200)
        self.assertEqual(response.headers.get_content_type(), "application/pdf")
        self.assertEqual(
            response.headers["Content-Disposition"],
            'attachment; filename="computational-mechanics-solver-v1.5.1-manual.pdf"',
        )
        self.assertTrue(body.startswith(b"%PDF-"))
        self.assertEqual(len(body), MANUAL_FILE.stat().st_size)
        self.assertEqual(body, MANUAL_FILE.read_bytes())

    def test_unknown_download_is_not_exposed(self):
        with self.assertRaises(HTTPError) as context:
            urlopen(f"{self.base_url}/downloads/not-found.pdf", timeout=5)
        self.assertEqual(context.exception.code, 404)

    def test_download_path_cannot_traverse_to_other_static_files(self):
        with self.assertRaises(HTTPError) as context:
            urlopen(f"{self.base_url}/downloads/%2e%2e/index.html", timeout=5)
        self.assertEqual(context.exception.code, 404)


if __name__ == "__main__":
    unittest.main()
