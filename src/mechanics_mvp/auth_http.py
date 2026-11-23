"""HTTP-facing helpers for the server-side account system."""

from __future__ import annotations

import os
import secrets
from email import policy
from email.parser import BytesParser
from http.cookies import SimpleCookie
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlsplit

from .auth import (
    AuthConfig,
    AuthError,
    AuthService,
    AuthValidationError,
    AvatarUpload,
    IssuedSession,
    PublicUser,
    SessionView,
)
from .database import Database


SESSION_COOKIE_NAME = "cms_session"
JSON_BODY_LIMIT = 1 * 1024 * 1024
MULTIPART_BODY_LIMIT = 3 * 1024 * 1024


class AuthOriginError(AuthError):
    code = "AUTH_ORIGIN_INVALID"
    status = 403


def create_auth_service(project_root: Path) -> tuple[AuthService, bool]:
    """Create the production/dev auth service without exposing local paths."""

    environment = os.environ.get("CMS_ENV", "development").strip().lower()
    data_root = _configured_data_root(project_root)
    database_url = os.environ.get("CMS_DATABASE_URL", "").strip()
    if not database_url and os.environ.get("PGHOST"):
        # libpq reads PGHOST, PGDATABASE, PGUSER and PGPASSWORD separately.
        database_url = "postgresql://"
    if not database_url:
        database_url = f"sqlite:///{(data_root / 'mechanics.db').as_posix()}"

    secret_value = os.environ.get("CMS_AUTH_SECRET", "")
    if secret_value:
        audit_secret = secret_value.encode("utf-8")
        if len(audit_secret) < 32:
            raise RuntimeError("CMS_AUTH_SECRET must contain at least 32 bytes.")
    elif environment == "production":
        raise RuntimeError("CMS_AUTH_SECRET is required in production.")
    else:
        audit_secret = _load_or_create_development_secret(data_root / ".auth-secret")

    database = Database(database_url)
    database.migrate()
    service = AuthService(
        database,
        AuthConfig(avatar_root=data_root / "avatars", audit_secret=audit_secret),
    )
    secure_cookie = _environment_flag(
        "CMS_COOKIE_SECURE",
        default=environment == "production",
    )
    if environment == "production" and not secure_cookie:
        raise RuntimeError("CMS_COOKIE_SECURE cannot be disabled in production.")
    return service, secure_cookie


def require_same_origin(headers: Any, *, public_origin: str | None = None, scheme: str = "http") -> None:
    def origin_tuple(value: str, *, allow_trailing_slash: bool = False) -> tuple[str, str, int]:
        parsed = urlsplit(value.strip())
        valid_paths = {"", "/"} if allow_trailing_slash else {""}
        if (parsed.scheme not in {"http", "https"} or not parsed.hostname
                or parsed.username is not None or parsed.password is not None
                or parsed.path not in valid_paths or parsed.query or parsed.fragment):
            raise ValueError("Invalid origin")
        port = parsed.port if parsed.port is not None else (443 if parsed.scheme == "https" else 80)
        return parsed.scheme, parsed.hostname.lower(), port

    configured_origin = (public_origin or "").strip()
    expected = configured_origin or f"{scheme}://{headers.get('Host', '')}"
    try:
        if origin_tuple(str(headers.get("Origin", ""))) == origin_tuple(
            expected, allow_trailing_slash=bool(configured_origin)
        ):
            return
    except ValueError:
        pass
    raise AuthOriginError("请求来源无效，请刷新页面后重试。")


def read_session_cookie(headers: Any) -> str:
    raw_cookie = str(headers.get("Cookie", ""))
    if not raw_cookie:
        return ""
    cookie = SimpleCookie()
    try:
        cookie.load(raw_cookie)
    except Exception:
        return ""
    morsel = cookie.get(SESSION_COOKIE_NAME)
    return morsel.value if morsel is not None else ""


def make_session_cookie(issued: IssuedSession, *, secure: bool) -> str:
    max_age = max(1, int(_session_ttl_seconds(issued)))
    attributes = [
        f"{SESSION_COOKIE_NAME}={issued.session_token}",
        "Path=/",
        f"Max-Age={max_age}",
        "HttpOnly",
        "SameSite=Lax",
    ]
    if secure:
        attributes.append("Secure")
    return "; ".join(attributes)


def clear_session_cookie(*, secure: bool) -> str:
    attributes = [
        f"{SESSION_COOKIE_NAME}=",
        "Path=/",
        "Max-Age=0",
        "HttpOnly",
        "SameSite=Lax",
    ]
    if secure:
        attributes.append("Secure")
    return "; ".join(attributes)


def public_user_payload(user: PublicUser) -> dict[str, Any]:
    return {
        "id": user.id,
        "username": user.username,
        "displayName": user.display_name,
        "avatarUrl": (
            f"/api/avatars/{quote(user.avatar_path, safe='')}"
            if user.avatar_path
            else None
        ),
        "role": user.role,
        "createdAt": user.created_at,
    }


def issued_session_payload(issued: IssuedSession) -> dict[str, Any]:
    return {
        "authenticated": True,
        "user": public_user_payload(issued.user),
        "csrfToken": issued.csrf_token,
        "expiresAt": issued.expires_at,
    }


def session_view_payload(view: SessionView | None) -> dict[str, Any]:
    if view is None:
        return {"authenticated": False}
    return {
        "authenticated": True,
        "user": public_user_payload(view.user),
        "csrfToken": view.csrf_token,
        "expiresAt": view.expires_at,
    }


def parse_avatar_multipart(content_type: str, body: bytes) -> AvatarUpload:
    if not content_type.lower().startswith("multipart/form-data;"):
        raise AuthValidationError("头像上传格式无效。")
    envelope = (
        f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode("utf-8")
        + body
    )
    try:
        message = BytesParser(policy=policy.default).parsebytes(envelope)
    except Exception:
        raise AuthValidationError("头像上传格式无效。") from None
    if not message.is_multipart():
        raise AuthValidationError("头像上传格式无效。")

    for part in message.iter_parts():
        if part.get_content_disposition() != "form-data":
            continue
        if part.get_param("name", header="content-disposition") != "avatar":
            continue
        filename = part.get_filename() or ""
        data = part.get_payload(decode=True)
        if not isinstance(data, bytes):
            raise AuthValidationError("头像文件无效。")
        return AvatarUpload(
            filename=filename,
            content_type=part.get_content_type(),
            data=data,
        )
    raise AuthValidationError("请选择头像文件。")


def error_payload(error: AuthError) -> dict[str, Any]:
    return {"error": {"code": error.code, "message": str(error)}}


def _configured_data_root(project_root: Path) -> Path:
    configured = os.environ.get("CMS_DATA_DIR", "").strip()
    if configured:
        path = Path(configured).expanduser()
        if not path.is_absolute():
            path = project_root / path
    else:
        path = project_root / "data"
    path.mkdir(parents=True, exist_ok=True)
    return path.resolve()


def _load_or_create_development_secret(path: Path) -> bytes:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f"{path.name}.{secrets.token_hex(8)}.tmp")
    if not path.exists():
        try:
            with os.fdopen(os.open(temporary, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600), "w") as stream:
                stream.write(secrets.token_hex(48))
                stream.flush()
                os.fsync(stream.fileno())
            try:
                if os.name == "nt":
                    os.rename(temporary, path)  # Windows rename never overwrites an existing destination.
                else:
                    os.link(temporary, path)
            except FileExistsError:
                pass  # A competing process published its complete secret first.
            except OSError:
                if not path.exists():
                    raise
        finally:
            temporary.unlink(missing_ok=True)
    secret = bytes.fromhex(path.read_text(encoding="ascii").strip())
    if len(secret) < 32:
        raise ValueError("Invalid persisted development secret.")
    return secret


def _environment_flag(name: str, *, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    normalized = raw.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise RuntimeError(f"{name} must be true or false.")


def _session_ttl_seconds(issued: IssuedSession) -> float:
    from datetime import datetime, timezone

    expires = datetime.fromisoformat(issued.expires_at.replace("Z", "+00:00"))
    return (expires.astimezone(timezone.utc) - datetime.now(timezone.utc)).total_seconds()
