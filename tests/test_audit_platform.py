"""Regression tests for database, auth, HTTP, and packaging audit items (F07, F23-F28, S03-S10)."""

from __future__ import annotations

import io
import json
import os
import sys
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.auth import (
    AuthConfig,
    AuthInvalidCredentialsError,
    AuthService,
    AuthValidationError,
    AvatarUpload,
)
from mechanics_mvp.auth_http import (
    AuthOriginError,
    _load_or_create_development_secret,
    require_same_origin,
)
from mechanics_mvp.database import Database, DatabaseConfigurationError
from mechanics_mvp.webapp import (
    MechanicsWebHandler,
    _forwarded_scheme,
    _proxy_networks,
    _text_field,
    _trusted_peer,
    forwarded_client_address,
    runtime_version_payload,
)


def _png_bytes(color: tuple[int, int, int]) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (16, 16), color).save(buf, format="PNG")
    return buf.getvalue()


class PlatformAuditTests(unittest.TestCase):
    def test_f07_sqlite_migration_rolls_back_ddl_on_failure_and_recovers_legacy_half_0002(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            # Part 1: simulated failure during 0002 rolls back all DDL cleanly
            db_path = root / "rollback.db"
            db = Database(f"sqlite:///{db_path.as_posix()}")
            original_execute_on = db.execute_on
            fail_once = {"armed": True}

            def failing_execute(conn, stmt, params=()):
                if fail_once["armed"] and "INSERT INTO schema_migrations" in stmt and params and params[0] == "0002_entitlements.sql":
                    fail_once["armed"] = False
                    raise RuntimeError("simulated crash before version record")
                return original_execute_on(conn, stmt, params)

            with patch.object(db, "execute_on", side_effect=failing_execute):
                with self.assertRaisesRegex(RuntimeError, "simulated crash"):
                    db.migrate()

            # Retry must succeed cleanly because 0002 DDL was rolled back
            db.migrate()
            versions = {r["version"] for r in db.fetch_all("SELECT version FROM schema_migrations")}
            self.assertIn("0002_entitlements.sql", versions)
            self.assertIn("0003_remove_membership.sql", versions)

            # Part 2: legacy half-migrated 0002 (3 ALTER columns committed without version row) recovers
            legacy_path = root / "legacy.db"
            mig_dir = Path(db.migrations_dir)
            legacy_db = Database(f"sqlite:///{legacy_path.as_posix()}")
            with legacy_db.transaction() as conn:
                conn.executescript(
                    "CREATE TABLE schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL);"
                    + (mig_dir / "0001_auth_schema.sql").read_text(encoding="utf-8")
                    + "INSERT INTO schema_migrations (version, applied_at) VALUES ('0001_auth_schema.sql', '2026-01-01T00:00:00Z');"
                    + "ALTER TABLE subscription_plans ADD COLUMN description TEXT NOT NULL DEFAULT '';"
                    + "ALTER TABLE subscription_plans ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;"
                    + "ALTER TABLE subscription_plans ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0, 1));"
                )
            legacy_db.migrate()
            legacy_versions = {r["version"] for r in legacy_db.fetch_all("SELECT version FROM schema_migrations")}
            self.assertEqual(
                legacy_versions,
                {"0001_auth_schema.sql", "0002_entitlements.sql", "0003_remove_membership.sql"},
            )

    def test_f23_sqlite_memory_database_migrates_persists_and_guards_close(self) -> None:
        db = Database("sqlite:///:memory:")
        db.migrate()
        tables = {r["name"] for r in db.fetch_all("SELECT name FROM sqlite_master WHERE type = ?", ("table",))}
        self.assertIn("users", tables)
        self.assertIn("schema_migrations", tables)
        db.close()
        db.close()  # idempotent
        with self.assertRaises(DatabaseConfigurationError):
            db.fetch_all("SELECT 1")

    def test_f24_concurrent_migrations_on_fresh_sqlite_do_not_collide(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            db_url = f"sqlite:///{(Path(tmp) / 'concurrent.db').as_posix()}"
            barrier = threading.Barrier(6)

            def run_migrate(_: int) -> str:
                db = Database(db_url)
                barrier.wait()
                db.migrate()
                return "ok"

            with ThreadPoolExecutor(max_workers=6) as pool:
                outcomes = list(pool.map(run_migrate, range(6)))
            self.assertEqual(outcomes, ["ok"] * 6)

    def test_f26_s07_avatar_versioned_url_and_rollback_safety(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            db = Database(f"sqlite:///{(root / 'auth.db').as_posix()}")
            db.migrate()
            svc = AuthService(db, AuthConfig(avatar_root=root / "avatars", audit_secret=b"a" * 32))
            issued = svc.register(
                username="avataruser",
                password="correct-horse-battery",
                display_name="头像测试",
                remote_address="127.0.0.1",
            )
            first = svc.update_avatar(
                issued.session_token,
                issued.csrf_token,
                AvatarUpload("a.png", "image/png", _png_bytes((10, 20, 30))),
            )
            second = svc.update_avatar(
                issued.session_token,
                issued.csrf_token,
                AvatarUpload("b.png", "image/png", _png_bytes((40, 50, 60))),
            )
            self.assertNotEqual(first.avatar_path, second.avatar_path)
            self.assertFalse(svc.avatar_file(first.avatar_path).exists())
            self.assertTrue(svc.avatar_file(second.avatar_path).is_file())

            # Failed DB commit keeps existing avatar intact and cleans up newly written file
            before_files = set((root / "avatars").iterdir())
            with patch.object(db, "execute_on", side_effect=RuntimeError("db write failed")):
                with self.assertRaisesRegex(RuntimeError, "db write failed"):
                    svc.update_avatar(
                        issued.session_token,
                        issued.csrf_token,
                        AvatarUpload("c.png", "image/png", _png_bytes((70, 80, 90))),
                    )
            self.assertEqual(set((root / "avatars").iterdir()), before_files)
            self.assertTrue(svc.avatar_file(second.avatar_path).is_file())

    def test_f28_text_field_and_auth_reject_non_string_values(self) -> None:
        for bad in (None, 123, True, ["a"], {"a": 1}):
            with self.subTest(bad=bad):
                with self.assertRaises(AuthValidationError):
                    _text_field({"username": bad}, "username")
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            db = Database(f"sqlite:///{(root / 'auth.db').as_posix()}")
            db.migrate()
            svc = AuthService(db, AuthConfig(avatar_root=root / "avatars", audit_secret=b"b" * 32))
            with self.assertRaises(AuthValidationError):
                svc.register(
                    username=None,  # type: ignore[arg-type]
                    password="correct-horse-battery",
                    display_name="正常",
                    remote_address="127.0.0.1",
                )
            with self.assertRaises(AuthValidationError):
                svc.register(
                    username="validuser",
                    password="correct-horse-battery",
                    display_name=None,  # type: ignore[arg-type]
                    remote_address="127.0.0.1",
                )

    def test_s03_stale_login_cannot_issue_session_after_password_change(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            db = Database(f"sqlite:///{(root / 'auth.db').as_posix()}")
            db.migrate()
            svc = AuthService(db, AuthConfig(avatar_root=root / "avatars", audit_secret=b"c" * 32))
            issued = svc.register(
                username="raceuser",
                password="old-password-1234",
                display_name="并发改密",
                remote_address="127.0.0.1",
            )
            real_hasher = svc._hasher

            triggered = {"done": False}

            class RacingHasher:
                def hash(self, password: str) -> str:
                    return real_hasher.hash(password)

                def check_needs_rehash(self, hashed: str) -> bool:
                    return real_hasher.check_needs_rehash(hashed)

                def verify(self, stored_hash: str, password: str) -> bool:
                    ok = real_hasher.verify(stored_hash, password)
                    # Simulate password change committing between verify() and session issuance
                    if ok and not triggered["done"]:
                        triggered["done"] = True
                        svc.change_password(
                            issued.session_token,
                            issued.csrf_token,
                            current_password="old-password-1234",
                            new_password="new-password-5678",
                        )
                    return ok

            svc._hasher = RacingHasher()
            with self.assertRaises(AuthInvalidCredentialsError):
                svc.login(username="raceuser", password="old-password-1234", remote_address="127.0.0.1")

    def test_s04_s05_trusted_proxy_scheme_and_origin_checks(self) -> None:
        trusted = _proxy_networks("127.0.0.1,10.0.0.0/8")
        self.assertTrue(_trusted_peer("127.0.0.1", trusted))
        self.assertTrue(_trusted_peer("::ffff:127.0.0.1", trusted))
        self.assertFalse(_trusted_peer("203.0.113.5", trusted))

        # Untrusted peer cannot spoof X-Real-IP or X-Forwarded-Proto
        spoofed = {"X-Real-IP": "1.2.3.4", "X-Forwarded-Proto": "https", "Host": "cms.leomath.cn"}
        self.assertEqual(forwarded_client_address(spoofed, "203.0.113.5", trusted), "203.0.113.5")
        self.assertEqual(_forwarded_scheme(spoofed, "203.0.113.5", trusted), "http")
        self.assertEqual(_forwarded_scheme(spoofed, "127.0.0.1", trusted), "https")
        self.assertEqual(_forwarded_scheme({"X-Forwarded-Proto": "http, HTTPS"}, "127.0.0.1", trusted), "https")

        # Cross-scheme Origin rejected
        require_same_origin({"Origin": "https://cms.leomath.cn", "Host": "cms.leomath.cn"}, scheme="https")
        with self.assertRaises(AuthOriginError):
            require_same_origin({"Origin": "http://cms.leomath.cn", "Host": "cms.leomath.cn"}, scheme="https")
        with self.assertRaises(AuthOriginError):
            require_same_origin(
                {"Origin": "http://cms.leomath.cn", "Host": "cms.leomath.cn"},
                public_origin="https://cms.leomath.cn/",
            )
        require_same_origin(
            {"Origin": "https://cms.leomath.cn", "Host": "ignored.local"},
            public_origin="https://cms.leomath.cn/",
        )
        # Origin header with path is rejected
        with self.assertRaises(AuthOriginError):
            require_same_origin({"Origin": "https://cms.leomath.cn/", "Host": "cms.leomath.cn"}, scheme="https")

    def test_s06_registration_rolls_back_user_if_session_insert_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            db = Database(f"sqlite:///{(root / 'auth.db').as_posix()}")
            db.migrate()
            svc = AuthService(db, AuthConfig(avatar_root=root / "avatars", audit_secret=b"d" * 32))
            with patch.object(svc, "_issue_session", side_effect=RuntimeError("session store unavailable")):
                with self.assertRaisesRegex(RuntimeError, "session store unavailable"):
                    svc.register(
                        username="atomicuser",
                        password="correct-horse-battery",
                        display_name="原子注册",
                        remote_address="127.0.0.1",
                    )
            # User row must NOT exist; retrying succeeds cleanly
            self.assertIsNone(db.fetch_one("SELECT id FROM users WHERE username = ?", ("atomicuser",)))
            issued = svc.register(
                username="atomicuser",
                password="correct-horse-battery",
                display_name="原子注册",
                remote_address="127.0.0.1",
            )
            self.assertEqual(issued.user.username, "atomicuser")

    def test_s08_parallel_dev_secret_creation_converges_to_one_secret(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            secret_path = Path(tmp) / "sub" / ".auth-secret"
            barrier = threading.Barrier(8)

            def load_secret(_: int) -> bytes:
                barrier.wait()
                return _load_or_create_development_secret(secret_path)

            with ThreadPoolExecutor(max_workers=8) as pool:
                secrets_found = list(pool.map(load_secret, range(8)))
            self.assertEqual(len(set(secrets_found)), 1)
            self.assertGreaterEqual(len(secrets_found[0]), 32)

    def test_s10_unknown_git_dirty_reports_null(self) -> None:
        with patch.dict(os.environ, {"MECHANICS_GIT_DIRTY": "unknown"}, clear=False):
            payload = runtime_version_payload()
            self.assertIsNone(payload["git_dirty"])


if __name__ == "__main__":
    unittest.main()
