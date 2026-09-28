"""Small HTTP app for the drawing UI."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import platform
import subprocess
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlsplit

from .auth import AuthError, AuthService, AuthValidationError, IssuedSession
from .auth_http import (
    JSON_BODY_LIMIT,
    MULTIPART_BODY_LIMIT,
    clear_session_cookie,
    create_auth_service,
    error_payload,
    issued_session_payload,
    make_session_cookie,
    parse_avatar_multipart,
    public_user_payload,
    read_session_cookie,
    require_same_origin,
    session_view_payload,
)
from .engine import solve_with_backend
from .entitlements import (
    EntitlementError,
    EntitlementService,
    create_entitlement_service,
    entitlement_error_payload,
    entitlement_view_payload,
)
from .project_io import project_from_dict
from .report import build_report_pdf, build_text_report_pdf
from .version import __version__


PROJECT_ROOT = Path(__file__).resolve().parents[2]
WEB_ROOT = PROJECT_ROOT / "web"
APPLICATION_ID = "computational-mechanics-solver"
APPLICATION_VERSION = os.environ.get("MECHANICS_VERSION", __version__)
STATIC_PROJECT_SCHEMA = "cms-static-project@1"
DYNAMICS_PROJECT_SCHEMA = "cms-dynamics-project@2"
STARTED_AT = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
# Largest accepted body for /api/solve, /api/report and /api/dynamics-report.
# Report requests carry two JPEG canvas snapshots as data URLs, which stay far
# below this; anything larger is rejected before the body is read.
SOLVER_BODY_LIMIT = 16 * 1024 * 1024
MANUAL_FILENAME = "computational-mechanics-solver-v1.3.2-manual.pdf"
MANUAL_DOWNLOAD_PATH = f"/downloads/{MANUAL_FILENAME}"
MANUAL_FILE = WEB_ROOT / "downloads" / MANUAL_FILENAME


class RequestBodyError(ValueError):
    """A request body could not be read; `status` is the HTTP status to reply with."""

    def __init__(self, message: str, status: int) -> None:
        super().__init__(message)
        self.status = status


def _git_short_commit() -> str:
    configured_commit = os.environ.get("MECHANICS_GIT_COMMIT", "").strip()
    if configured_commit:
        if 7 <= len(configured_commit) <= 40 and all(character in "0123456789abcdefABCDEF" for character in configured_commit):
            return configured_commit.lower()
        return "unknown"
    try:
        completed = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=PROJECT_ROOT,
            check=False,
            capture_output=True,
            text=True,
            timeout=2,
        )
    except (OSError, subprocess.SubprocessError):
        return "unknown"
    commit = completed.stdout.strip()
    return commit if completed.returncode == 0 and commit else "unknown"


def _git_is_dirty() -> bool:
    configured_dirty = os.environ.get("MECHANICS_GIT_DIRTY")
    if configured_dirty is not None:
        normalized = configured_dirty.strip().lower()
        if normalized in {"0", "false", "no", "off"}:
            return False
        if normalized in {"1", "true", "yes", "on"}:
            return True
        return True
    try:
        completed = subprocess.run(
            ["git", "status", "--porcelain", "--untracked-files=normal"],
            cwd=PROJECT_ROOT,
            check=False,
            capture_output=True,
            text=True,
            timeout=2,
        )
    except (OSError, subprocess.SubprocessError):
        return True
    return completed.returncode != 0 or bool(completed.stdout.strip())


def runtime_version_payload() -> dict[str, str | bool]:
    return {
        "application": APPLICATION_ID,
        "version": APPLICATION_VERSION,
        "git_commit": _git_short_commit(),
        "git_dirty": _git_is_dirty(),
        "started_at": STARTED_AT,
        "python_version": platform.python_version(),
        "schema_static": STATIC_PROJECT_SCHEMA,
        "schema_dynamics": DYNAMICS_PROJECT_SCHEMA,
    }


def solve_project_payload(raw: dict[str, Any]) -> dict[str, Any]:
    project = project_from_dict(raw)
    result = solve_with_backend(project, _solver_backend(raw))
    return {
        "displacements": result.displacements,
        "reactions": result.reactions,
        "element_end_forces": result.element_end_forces,
        "element_diagrams": result.element_diagrams,
        "summary": result.summary,
    }


def report_project_payload(raw: dict[str, Any]) -> bytes:
    project = project_from_dict(raw)
    result = solve_with_backend(project, _solver_backend(raw))
    images = raw.get("report_images", {})
    options = raw.get("report_options", [])
    if isinstance(options, str):
        options = [item for item in options.split(",") if item]
    if not isinstance(options, list):
        options = []
    return build_report_pdf(project, result, images=images, options=options)


def dynamics_report_payload(raw: dict[str, Any]) -> bytes:
    text = str(raw.get("report_text", "")).strip()
    if not text:
        raise ValueError("Dynamics report text is empty.")
    if len(text) > 200_000:
        raise ValueError("Dynamics report text is too large.")
    return build_text_report_pdf(text, images=raw.get("report_images", {}), title="动力学计算书")


def _solver_backend(raw: dict[str, Any]) -> str:
    metadata = raw.get("metadata", {})
    return str(raw.get("solver") or metadata.get("solver") or "frame2d")


class MechanicsWebHandler(BaseHTTPRequestHandler):
    server_version = f"MechanicsMVP/{APPLICATION_VERSION}"

    def do_GET(self) -> None:
        request_path = urlsplit(self.path).path
        if request_path == "/api/version":
            self._send_json(runtime_version_payload())
            return

        if request_path == "/api/auth/session":
            self._handle_auth_session()
            return

        if request_path == "/api/entitlements":
            self._handle_entitlement_view()
            return

        if request_path.startswith("/api/avatars/"):
            self._serve_avatar(request_path.removeprefix("/api/avatars/"))
            return

        if request_path == MANUAL_DOWNLOAD_PATH:
            self._serve_manual()
            return

        if request_path.startswith("/downloads/"):
            self.send_error(404, "Not found")
            return

        if request_path in ("", "/"):
            self._serve_static("index.html")
            return

        if request_path.startswith("/static/"):
            self._serve_static(request_path.removeprefix("/static/"))
            return

        self.send_error(404, "Not found")

    def do_POST(self) -> None:
        request_path = urlsplit(self.path).path
        if request_path in {
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/logout",
            "/api/auth/password",
            "/api/auth/avatar",
        }:
            self._handle_auth_mutation("POST", request_path)
            return

        if request_path in {
            "/api/entitlements/internal/redeem",
            "/api/entitlements/internal/revoke",
            "/api/pinn/waitlist",
        }:
            self._handle_entitlement_mutation(request_path)
            return

        if request_path not in {"/api/solve", "/api/report", "/api/dynamics-report"}:
            self.send_error(404, "Not found")
            return

        try:
            raw_body = self._read_raw_body(SOLVER_BODY_LIMIT)
        except RequestBodyError as error:
            self._send_json({"error": str(error)}, status=error.status)
            return
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json({"error": "请求内容不是有效的 JSON。"}, status=422)
            return
        if not isinstance(payload, dict):
            self._send_json({"error": "请求内容必须为 JSON 对象。"}, status=422)
            return

        try:
            if request_path in {"/api/report", "/api/dynamics-report"}:
                required_entitlement = self._report_entitlement(payload)
                if required_entitlement:
                    user = self._auth_service().authenticated_user(read_session_cookie(self.headers))
                    self._entitlement_service().require(user.id, required_entitlement)
            if request_path == "/api/dynamics-report":
                self._send_bytes(
                    dynamics_report_payload(payload),
                    content_type="application/pdf",
                    headers={"Content-Disposition": 'attachment; filename="dynamics-report.pdf"'},
                )
                return
            if request_path == "/api/report":
                self._send_bytes(
                    report_project_payload(payload),
                    content_type="application/pdf",
                    headers={"Content-Disposition": 'attachment; filename="mechanics-report.pdf"'},
                )
                return
            response = solve_project_payload(payload)
        except AuthError as error:
            self._send_auth_error(error)
            return
        except EntitlementError as error:
            self._send_entitlement_error(error)
            return
        except Exception as exc:  # noqa: BLE001 - user-facing API boundary.
            self._send_json({"error": str(exc)}, status=422)
            return

        self._send_json(response)

    def do_PATCH(self) -> None:
        request_path = urlsplit(self.path).path
        if request_path != "/api/auth/profile":
            self.send_error(404, "Not found")
            return
        self._handle_auth_mutation("PATCH", request_path)

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _handle_auth_session(self) -> None:
        try:
            view = self._auth_service().session(read_session_cookie(self.headers))
            self._send_json(session_view_payload(view))
        except AuthError as error:
            self._send_auth_error(error)
        except Exception:  # noqa: BLE001 - do not expose backend details.
            self._send_auth_internal_error()

    def _handle_auth_mutation(self, method: str, request_path: str) -> None:
        try:
            require_same_origin(self.headers)
            service = self._auth_service()
            session_token = read_session_cookie(self.headers)
            csrf_token = str(self.headers.get("X-CSRF-Token", ""))
            remote_address = str(self.client_address[0]) if self.client_address else "unknown"

            if method == "POST" and request_path == "/api/auth/register":
                payload = self._read_json_body()
                if payload.get("acceptedTerms") is not True or payload.get("acceptedPrivacy") is not True:
                    raise AuthValidationError("请先阅读并同意用户协议与隐私说明。")
                password = str(payload.get("password", ""))
                if password != str(payload.get("passwordConfirm", "")):
                    raise AuthValidationError("两次输入的密码不一致。")
                issued = service.register(
                    username=str(payload.get("username", "")),
                    password=password,
                    display_name=str(payload.get("displayName", "")),
                    remote_address=remote_address,
                )
                self._send_issued_session(issued, status=201)
                return

            if method == "POST" and request_path == "/api/auth/login":
                payload = self._read_json_body()
                issued = service.login(
                    username=str(payload.get("username", "")),
                    password=str(payload.get("password", "")),
                    remote_address=remote_address,
                )
                self._send_issued_session(issued)
                return

            if method == "POST" and request_path == "/api/auth/logout":
                self._read_json_body(allow_empty=True)
                service.logout(session_token, csrf_token)
                self._send_json(
                    {"ok": True},
                    headers={"Set-Cookie": clear_session_cookie(secure=self._auth_cookie_secure())},
                )
                return

            if method == "POST" and request_path == "/api/auth/password":
                payload = self._read_json_body()
                new_password = str(payload.get("newPassword", ""))
                if new_password != str(payload.get("newPasswordConfirm", "")):
                    raise AuthValidationError("两次输入的新密码不一致。")
                issued = service.change_password(
                    session_token,
                    csrf_token,
                    current_password=str(payload.get("currentPassword", "")),
                    new_password=new_password,
                )
                self._send_issued_session(issued)
                return

            if method == "POST" and request_path == "/api/auth/avatar":
                body = self._read_body(MULTIPART_BODY_LIMIT)
                avatar = parse_avatar_multipart(str(self.headers.get("Content-Type", "")), body)
                user = service.update_avatar(session_token, csrf_token, avatar)
                self._send_json({"user": public_user_payload(user)})
                return

            if method == "PATCH" and request_path == "/api/auth/profile":
                payload = self._read_json_body()
                user = service.update_profile(
                    session_token,
                    csrf_token,
                    display_name=str(payload.get("displayName", "")),
                )
                self._send_json({"user": public_user_payload(user)})
                return

            self.send_error(404, "Not found")
        except AuthError as error:
            self._send_auth_error(error)
        except Exception:  # noqa: BLE001 - do not expose backend details or secrets.
            self._send_auth_internal_error()

    def _handle_entitlement_view(self) -> None:
        try:
            auth_service = self._auth_service()
            user = auth_service.authenticated_user(read_session_cookie(self.headers))
            view = self._entitlement_service().view_for_user(user.id)
            refreshed_user = auth_service.authenticated_user(read_session_cookie(self.headers))
            payload = entitlement_view_payload(view)
            payload["user"] = public_user_payload(refreshed_user)
            self._send_json(payload)
        except AuthError as error:
            self._send_auth_error(error)
        except EntitlementError as error:
            self._send_entitlement_error(error)
        except Exception:  # noqa: BLE001 - do not expose backend details.
            self._send_auth_internal_error()

    def _handle_entitlement_mutation(self, request_path: str) -> None:
        try:
            require_same_origin(self.headers)
            auth_service = self._auth_service()
            session_token = read_session_cookie(self.headers)
            csrf_token = str(self.headers.get("X-CSRF-Token", ""))
            user = auth_service.authorized_user(session_token, csrf_token)
            service = self._entitlement_service()
            payload = self._read_json_body(allow_empty=True)

            if request_path == "/api/entitlements/internal/redeem":
                view = service.redeem_internal_access(
                    user_id=user.id,
                    invite_code=str(payload.get("inviteCode", "")),
                    remote_address=(
                        str(self.client_address[0]) if self.client_address else "unknown"
                    ),
                )
            elif request_path == "/api/entitlements/internal/revoke":
                view = service.revoke_internal_access(
                    actor_user_id=user.id,
                    target_user_id=str(payload.get("targetUserId", "")),
                )
            elif request_path == "/api/pinn/waitlist":
                view = service.join_pinn_waitlist(user.id)
            else:
                self.send_error(404, "Not found")
                return

            refreshed_user = auth_service.authenticated_user(session_token)
            response = entitlement_view_payload(view)
            response["user"] = public_user_payload(refreshed_user)
            self._send_json(response)
        except AuthError as error:
            self._send_auth_error(error)
        except EntitlementError as error:
            self._send_entitlement_error(error)
        except Exception:  # noqa: BLE001 - do not expose backend details or credentials.
            self._send_auth_internal_error()

    def _serve_avatar(self, encoded_name: str) -> None:
        try:
            name = unquote(encoded_name, errors="strict")
            target = self._auth_service().avatar_file(name)
        except (AuthError, UnicodeError, ValueError):
            self.send_error(404, "Not found")
            return
        if not target.is_file():
            self.send_error(404, "Not found")
            return
        content_type = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".webp": "image/webp",
        }.get(target.suffix.lower())
        if content_type is None:
            self.send_error(404, "Not found")
            return
        self._send_bytes(
            target.read_bytes(),
            content_type=content_type,
            headers={
                "Cache-Control": "public, max-age=3600",
                "X-Content-Type-Options": "nosniff",
            },
        )

    def _auth_service(self) -> AuthService:
        service = getattr(self.server, "auth_service", None)
        if not isinstance(service, AuthService):
            raise RuntimeError("Authentication service is unavailable.")
        return service

    def _auth_cookie_secure(self) -> bool:
        return bool(getattr(self.server, "auth_cookie_secure", False))

    def _entitlement_service(self) -> EntitlementService:
        service = getattr(self.server, "entitlement_service", None)
        if not isinstance(service, EntitlementService):
            raise RuntimeError("Entitlement service is unavailable.")
        return service

    @staticmethod
    def _report_entitlement(payload: dict[str, Any]) -> str | None:
        options = payload.get("report_options", [])
        if isinstance(options, str):
            options = [item.strip() for item in options.split(",")]
        if not isinstance(options, list):
            return None
        normalized = {str(item).strip().casefold() for item in options}
        if normalized.intersection({"formal", "professional", "pro_report"}):
            return "report.formal"
        if normalized.intersection({"advanced", "advanced_export"}):
            return "export.advanced"
        return None

    def _read_json_body(self, *, allow_empty: bool = False) -> dict[str, Any]:
        body = self._read_body(JSON_BODY_LIMIT)
        if not body and allow_empty:
            return {}
        try:
            payload = json.loads(body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise AuthValidationError("请求内容不是有效的 JSON。") from None
        if not isinstance(payload, dict):
            raise AuthValidationError("请求内容必须为 JSON 对象。")
        return payload

    def _read_body(self, limit: int) -> bytes:
        """Read a bounded body for the account endpoints (errors map to 422)."""

        try:
            return self._read_raw_body(limit)
        except RequestBodyError as error:
            raise AuthValidationError(str(error)) from None

    def _read_raw_body(self, limit: int) -> bytes:
        """Read at most `limit` bytes of request body.

        Raises RequestBodyError with status 400 for a chunked or malformed
        request and 413 when Content-Length exceeds the limit; the body is not
        read in either case.
        """

        transfer_encoding = str(self.headers.get("Transfer-Encoding", "")).strip().lower()
        if transfer_encoding and transfer_encoding != "identity":
            raise RequestBodyError("不支持分块上传。", 400)
        raw_length = str(self.headers.get("Content-Length", "0")).strip()
        try:
            length = int(raw_length)
        except ValueError:
            raise RequestBodyError("请求长度无效。", 400) from None
        if length < 0:
            raise RequestBodyError("请求长度无效。", 400)
        if length > limit:
            raise RequestBodyError(f"请求内容过大：超过 {limit} 字节上限。", 413)
        body = self.rfile.read(length)
        if len(body) != length:
            raise RequestBodyError("请求内容不完整。", 400)
        return body

    def _send_issued_session(self, issued: IssuedSession, *, status: int = 200) -> None:
        self._send_json(
            issued_session_payload(issued),
            status=status,
            headers={
                "Set-Cookie": make_session_cookie(
                    issued,
                    secure=self._auth_cookie_secure(),
                )
            },
        )

    def _send_auth_error(self, error: AuthError) -> None:
        headers: dict[str, str] = {}
        if error.retry_after is not None:
            headers["Retry-After"] = str(error.retry_after)
        self._send_json(error_payload(error), status=error.status, headers=headers)

    def _send_entitlement_error(self, error: EntitlementError) -> None:
        headers: dict[str, str] = {}
        if error.retry_after is not None:
            headers["Retry-After"] = str(error.retry_after)
        self._send_json(
            entitlement_error_payload(error),
            status=error.status,
            headers=headers,
        )

    def _send_auth_internal_error(self) -> None:
        self._send_json(
            {
                "error": {
                    "code": "AUTH_INTERNAL_ERROR",
                    "message": "账户服务暂时不可用，请稍后再试。",
                }
            },
            status=500,
        )

    def _serve_static(self, relative_path: str) -> None:
        web_root = WEB_ROOT.resolve()
        target = (WEB_ROOT / relative_path).resolve()
        if not target.is_relative_to(web_root) or not target.is_file():
            self.send_error(404, "Not found")
            return

        content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _serve_manual(self) -> None:
        if not MANUAL_FILE.is_file():
            self.send_error(404, "The v1.3.2 historical manual is unavailable")
            return
        self._send_bytes(
            MANUAL_FILE.read_bytes(),
            content_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{MANUAL_FILENAME}"'},
        )

    def _send_json(
        self,
        payload: dict[str, Any],
        *,
        status: int = 200,
        headers: dict[str, str] | None = None,
    ) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        response_headers = {
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            **(headers or {}),
        }
        self._send_bytes(
            data,
            content_type="application/json; charset=utf-8",
            status=status,
            headers=response_headers,
        )

    def _send_bytes(
        self,
        data: bytes,
        *,
        content_type: str,
        status: int = 200,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        security_headers = {
            "Content-Security-Policy": (
                "default-src 'self'; img-src 'self' data: blob:; "
                "style-src 'self'; script-src 'self'; connect-src 'self'; "
                "font-src 'self'; object-src 'none'; base-uri 'self'; "
                "frame-ancestors 'none'; form-action 'self'"
            ),
            "Referrer-Policy": "no-referrer",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        }
        security_headers.update(headers or {})
        for key, value in security_headers.items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(data)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the mechanics MVP drawing app.")
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8765")))
    args = parser.parse_args(argv)

    auth_service, auth_cookie_secure = create_auth_service(PROJECT_ROOT)
    entitlement_service = create_entitlement_service(
        auth_service.database,
        auth_service.config.audit_secret,
    )
    server = ThreadingHTTPServer((args.host, args.port), MechanicsWebHandler)
    server.auth_service = auth_service
    server.auth_cookie_secure = auth_cookie_secure
    server.entitlement_service = entitlement_service
    print(f"Mechanics MVP web app: http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
