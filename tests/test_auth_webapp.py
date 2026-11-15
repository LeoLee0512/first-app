from __future__ import annotations

import http.cookiejar
import io
import json
import sys
import tempfile
import threading
import unittest
from dataclasses import replace
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.auth import AuthConfig, AuthService
from mechanics_mvp.database import Database
from mechanics_mvp.webapp import MechanicsWebHandler, forwarded_client_address
from http.server import ThreadingHTTPServer


class AuthWebAppTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        root = Path(self.temp_dir.name)
        database = Database(f"sqlite:///{(root / 'auth.db').as_posix()}")
        database.migrate()
        self.auth_service = AuthService(
            database,
            AuthConfig(
                avatar_root=root / "avatars",
                audit_secret=b"http-test-audit-secret-with-entropy",
            ),
        )
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), MechanicsWebHandler)
        self.server.auth_service = self.auth_service
        self.server.auth_cookie_secure = False
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        host, port = self.server.server_address
        self.base_url = f"http://{host}:{port}"
        self.origin = self.base_url
        self.cookie_jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookie_jar)
        )

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)
        self.temp_dir.cleanup()

    @staticmethod
    def _png_bytes() -> bytes:
        buffer = io.BytesIO()
        Image.new("RGB", (24, 24), (80, 100, 120)).save(buffer, format="PNG")
        return buffer.getvalue()

    def _request(
        self,
        path: str,
        *,
        method: str = "GET",
        payload: dict | None = None,
        data: bytes | None = None,
        headers: dict[str, str] | None = None,
        opener=None,
    ):
        request_headers = dict(headers or {})
        if payload is not None:
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            request_headers["Content-Type"] = "application/json"
        request = urllib.request.Request(
            self.base_url + path,
            data=data,
            headers=request_headers,
            method=method,
        )
        client = opener or self.opener
        try:
            response = client.open(request, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        body = response.read()
        content_type = response.headers.get("Content-Type", "")
        parsed = json.loads(body.decode("utf-8")) if "application/json" in content_type else body
        return response.status, response.headers, parsed

    def _register(self):
        return self._request(
            "/api/auth/register",
            method="POST",
            headers={"Origin": self.origin},
            payload={
                "username": "student01",
                "password": "correct-horse-battery",
                "passwordConfirm": "correct-horse-battery",
                "displayName": "结构力学同学",
                "acceptedTerms": True,
                "acceptedPrivacy": True,
            },
        )

    def test_register_sets_secure_cookie_contract_and_session_is_server_backed(self) -> None:
        status, headers, payload = self._register()
        self.assertEqual(status, 201)
        cookie = headers.get("Set-Cookie", "")
        self.assertIn("cms_session=", cookie)
        self.assertIn("HttpOnly", cookie)
        self.assertIn("SameSite=Lax", cookie)
        self.assertIn("Path=/", cookie)
        self.assertIn("Max-Age=", cookie)
        self.assertNotIn("Secure", cookie)
        self.assertEqual(headers.get("Cache-Control"), "no-store")
        self.assertIn("default-src 'self'", headers.get("Content-Security-Policy", ""))
        self.assertEqual(headers.get("X-Frame-Options"), "DENY")
        self.assertEqual(payload["user"]["username"], "student01")
        self.assertEqual(payload["user"]["displayName"], "结构力学同学")
        self.assertEqual(payload["user"]["role"], "free")
        self.assertNotIn("password", json.dumps(payload).lower())
        self.assertGreater(len(payload["csrfToken"]), 40)

        status, _headers, session = self._request("/api/auth/session")
        self.assertEqual(status, 200)
        self.assertTrue(session["authenticated"])
        self.assertEqual(session["user"]["id"], payload["user"]["id"])
        self.assertEqual(session["csrfToken"], payload["csrfToken"])

    def test_production_cookie_contract_adds_secure_attribute(self) -> None:
        self.server.auth_cookie_secure = True
        status, headers, _payload = self._register()
        self.assertEqual(status, 201)
        self.assertIn("Secure", headers.get("Set-Cookie", ""))

    def test_registration_requires_agreements_and_same_origin(self) -> None:
        registration = {
            "username": "student02",
            "password": "correct-horse-battery",
            "passwordConfirm": "correct-horse-battery",
            "displayName": "同学",
            "acceptedTerms": False,
            "acceptedPrivacy": True,
        }
        status, _headers, payload = self._request(
            "/api/auth/register",
            method="POST",
            headers={"Origin": self.origin},
            payload=registration,
        )
        self.assertEqual(status, 422)
        self.assertEqual(payload["error"]["code"], "AUTH_VALIDATION")

        registration["acceptedTerms"] = True
        status, _headers, payload = self._request(
            "/api/auth/register",
            method="POST",
            headers={"Origin": "https://attacker.example"},
            payload=registration,
        )
        self.assertEqual(status, 403)
        self.assertEqual(payload["error"]["code"], "AUTH_ORIGIN_INVALID")

    def test_login_does_not_enumerate_usernames(self) -> None:
        self._register()
        anonymous = urllib.request.build_opener()
        bodies = []
        for username in ("student01", "missing-user"):
            status, _headers, payload = self._request(
                "/api/auth/login",
                method="POST",
                headers={"Origin": self.origin},
                payload={"username": username, "password": "wrong-password"},
                opener=anonymous,
            )
            self.assertEqual(status, 401)
            bodies.append(payload)
        self.assertEqual(bodies[0], bodies[1])

    def test_profile_logout_and_password_routes_enforce_csrf(self) -> None:
        _status, _headers, registered = self._register()
        csrf = registered["csrfToken"]

        status, _headers, payload = self._request(
            "/api/auth/profile",
            method="PATCH",
            headers={"Origin": self.origin},
            payload={"displayName": "没有令牌"},
        )
        self.assertEqual(status, 403)
        self.assertEqual(payload["error"]["code"], "AUTH_CSRF_INVALID")

        status, _headers, payload = self._request(
            "/api/auth/profile",
            method="PATCH",
            headers={"Origin": self.origin, "X-CSRF-Token": csrf},
            payload={"displayName": "新昵称"},
        )
        self.assertEqual(status, 200)
        self.assertEqual(payload["user"]["displayName"], "新昵称")

        status, headers, payload = self._request(
            "/api/auth/password",
            method="POST",
            headers={"Origin": self.origin, "X-CSRF-Token": csrf},
            payload={
                "currentPassword": "correct-horse-battery",
                "newPassword": "new-correct-horse-battery",
                "newPasswordConfirm": "new-correct-horse-battery",
            },
        )
        self.assertEqual(status, 200)
        self.assertIn("cms_session=", headers.get("Set-Cookie", ""))
        rotated_csrf = payload["csrfToken"]
        self.assertNotEqual(rotated_csrf, csrf)

        status, headers, payload = self._request(
            "/api/auth/logout",
            method="POST",
            headers={"Origin": self.origin, "X-CSRF-Token": rotated_csrf},
            payload={},
        )
        self.assertEqual(status, 200)
        self.assertTrue(payload["ok"])
        self.assertIn("Max-Age=0", headers.get("Set-Cookie", ""))
        status, _headers, session = self._request("/api/auth/session")
        self.assertEqual(status, 200)
        self.assertFalse(session["authenticated"])

    def test_avatar_upload_and_download_validate_multipart_content(self) -> None:
        _status, _headers, registered = self._register()
        boundary = "----cms-auth-test-boundary"
        image_data = self._png_bytes()
        body = (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="avatar"; filename="portrait.png"\r\n'
            "Content-Type: image/png\r\n\r\n"
        ).encode("ascii") + image_data + f"\r\n--{boundary}--\r\n".encode("ascii")
        status, _headers, payload = self._request(
            "/api/auth/avatar",
            method="POST",
            data=body,
            headers={
                "Origin": self.origin,
                "X-CSRF-Token": registered["csrfToken"],
                "Content-Type": f"multipart/form-data; boundary={boundary}",
            },
        )
        self.assertEqual(status, 200)
        avatar_url = payload["user"]["avatarUrl"]
        self.assertTrue(avatar_url.startswith("/api/avatars/"))
        status, headers, avatar = self._request(avatar_url)
        self.assertEqual(status, 200)
        self.assertEqual(headers.get_content_type(), "image/png")
        self.assertGreater(len(avatar), 50)

        status, _headers, _payload = self._request("/api/avatars/%2e%2e%2fsecret")
        self.assertEqual(status, 404)

    def _register_as(self, username: str, **headers: str):
        return self._request(
            "/api/auth/register",
            method="POST",
            headers={"Origin": self.origin, **headers},
            payload={
                "username": username,
                "password": "correct-horse-battery",
                "passwordConfirm": "correct-horse-battery",
                "displayName": "同学",
                "acceptedTerms": True,
                "acceptedPrivacy": True,
            },
        )

    def test_forwarded_client_address_prefers_real_ip_then_last_forwarded_hop(self) -> None:
        class Headers(dict):
            def get(self, key, default=None):
                return super().get(key, default)

        self.assertEqual(
            forwarded_client_address(
                Headers({"X-Real-IP": "203.0.113.10", "X-Forwarded-For": "198.51.100.1, 203.0.113.10"}),
                "10.0.0.8",
            ),
            "203.0.113.10",
        )
        self.assertEqual(
            forwarded_client_address(
                Headers({"X-Forwarded-For": "198.51.100.1, 203.0.113.10"}),
                "10.0.0.8",
            ),
            "203.0.113.10",
        )
        self.assertEqual(forwarded_client_address(Headers({"X-Real-IP": "not-an-ip"}), "10.0.0.8"), "10.0.0.8")

    def test_registration_bucket_follows_forwarded_client_not_the_proxy(self) -> None:
        self.auth_service.config = replace(self.auth_service.config, registration_address_limit=2)
        first, _, _ = self._register_as("student-a", **{"X-Real-IP": "203.0.113.10"})
        second, _, _ = self._register_as(
            "student-b",
            **{"X-Real-IP": "203.0.113.10", "X-Forwarded-For": "198.51.100.9, 203.0.113.10"},
        )
        blocked, _, payload = self._register_as(
            "student-c",
            **{"X-Real-IP": "203.0.113.10", "X-Forwarded-For": "198.51.100.77"},
        )
        other, _, _ = self._register_as("student-d", **{"X-Real-IP": "203.0.113.11"})
        self.assertEqual(first, 201)
        self.assertEqual(second, 201)
        self.assertEqual(blocked, 429)
        self.assertEqual(payload["error"]["code"], "AUTH_RATE_LIMITED")
        self.assertEqual(other, 201)

        forwarded_first, _, _ = self._register_as(
            "student-e",
            **{"X-Forwarded-For": "203.0.113.50, 198.51.100.20"},
        )
        forwarded_second, _, _ = self._register_as(
            "student-f",
            **{"X-Forwarded-For": "203.0.113.51, 198.51.100.20"},
        )
        forwarded_blocked, _, forwarded_payload = self._register_as(
            "student-i",
            **{"X-Forwarded-For": "203.0.113.52, 198.51.100.20"},
        )
        self.assertEqual(forwarded_first, 201)
        self.assertEqual(forwarded_second, 201)
        self.assertEqual(forwarded_blocked, 429, forwarded_payload)

    def test_username_login_limit_still_applies_across_forwarded_addresses(self) -> None:
        self.auth_service.config = replace(
            self.auth_service.config,
            login_username_limit=2,
            login_address_limit=30,
        )
        status, _, _ = self._register_as("student-g", **{"X-Real-IP": "203.0.113.20"})
        self.assertEqual(status, 201)
        anonymous = urllib.request.build_opener()
        for address in ("203.0.113.21", "203.0.113.22"):
            status, _, payload = self._request(
                "/api/auth/login",
                method="POST",
                headers={"Origin": self.origin, "X-Real-IP": address},
                payload={"username": "student-g", "password": "wrong-password"},
                opener=anonymous,
            )
            self.assertEqual(status, 401, payload)
        status, _, payload = self._request(
            "/api/auth/login",
            method="POST",
            headers={"Origin": self.origin, "X-Real-IP": "203.0.113.23"},
            payload={"username": "student-g", "password": "wrong-password"},
            opener=anonymous,
        )
        self.assertEqual(status, 429)
        self.assertEqual(payload["error"]["code"], "AUTH_RATE_LIMITED")

        status, _, created = self._register_as("student-h", **{"X-Real-IP": "203.0.113.24"})
        self.assertEqual(status, 201)
        status, _, payload = self._request(
            "/api/auth/login",
            method="POST",
            headers={"Origin": self.origin, "X-Real-IP": "203.0.113.25"},
            payload={"username": "student-h", "password": "wrong-password"},
            opener=anonymous,
        )
        self.assertEqual(status, 401)
        self.assertNotEqual(payload["error"]["code"], "AUTH_RATE_LIMITED")
        self.assertEqual(created["user"]["username"], "student-h")

    def test_static_pages_use_the_same_framing_protections(self) -> None:
        pages = {
            "/": b'id="loginCard"',
            "/static/privacy.html": "隐私说明".encode(),
            "/static/terms.html": "用户协议".encode(),
            "/static/app.js": b"function buildProject",
            "/static/auth-client.js": b"authenticated",
        }
        for path, marker in pages.items():
            status, headers, body = self._request(path)
            self.assertEqual(status, 200, path)
            policy = headers.get("Content-Security-Policy", "")
            self.assertIn("script-src 'self'", policy, path)
            self.assertIn("frame-ancestors 'none'", policy, path)
            self.assertNotIn("unsafe-inline", policy, path)
            self.assertEqual(headers.get("X-Frame-Options"), "DENY", path)
            self.assertIn(marker, body)
        status, _headers, home = self._request("/")
        self.assertEqual(status, 200)
        self.assertNotRegex(home.decode("utf-8"), r"<script(?![^>]*\bsrc=)")


if __name__ == "__main__":
    unittest.main()
