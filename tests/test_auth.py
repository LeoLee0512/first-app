from __future__ import annotations

import io
import sys
import tempfile
import unittest
from datetime import timedelta
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mechanics_mvp.auth import (
    AuthConfig,
    AuthConflictError,
    AuthCsrfError,
    AuthInvalidCredentialsError,
    AuthRateLimitError,
    AuthService,
    AuthValidationError,
    AvatarUpload,
)
from mechanics_mvp.database import Database


class AuthServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        root = Path(self.temp_dir.name)
        self.database = Database(f"sqlite:///{(root / 'auth.db').as_posix()}")
        self.database.migrate()
        self.service = AuthService(
            self.database,
            AuthConfig(
                avatar_root=root / "avatars",
                audit_secret=b"test-audit-secret-with-enough-entropy",
                session_ttl=timedelta(hours=1),
                login_window=timedelta(minutes=15),
                login_username_limit=3,
                login_address_limit=10,
                registration_window=timedelta(hours=1),
                registration_address_limit=5,
            ),
        )

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    @staticmethod
    def _png_bytes() -> bytes:
        buffer = io.BytesIO()
        Image.new("RGB", (32, 32), (20, 40, 60)).save(buffer, format="PNG")
        return buffer.getvalue()

    def _register(self, username: str = "student01"):
        return self.service.register(
            username=username,
            password="correct-horse-battery",
            display_name="结构力学同学",
            remote_address="127.0.0.1",
        )

    def test_migration_creates_required_auth_tables(self) -> None:
        rows = self.database.fetch_all(
            "SELECT name FROM sqlite_master WHERE type = ?",
            ("table",),
        )
        names = {row["name"] for row in rows}
        self.assertTrue(
            {
                "users",
                "sessions",
                "roles",
                "login_attempts",
                "schema_migrations",
            }.issubset(names)
        )
        # v1.5.1 dropped the membership tables; no plan, entitlement or invite data remains.
        self.assertTrue(
            {
                "entitlements",
                "subscription_plans",
                "user_entitlements",
                "role_entitlements",
                "internal_access_grants",
                "pinn_waitlist",
            }.isdisjoint(names)
        )
        role_names = {row["name"] for row in self.database.fetch_all("SELECT name FROM roles")}
        self.assertEqual(role_names, {"free", "admin"})

    def test_registration_hashes_password_and_issues_revocable_session(self) -> None:
        issued = self._register()
        row = self.database.fetch_one(
            "SELECT username, password_hash, display_name, role FROM users WHERE id = ?",
            (issued.user.id,),
        )
        self.assertIsNotNone(row)
        self.assertEqual(row["username"], "student01")
        self.assertEqual(row["display_name"], "结构力学同学")
        self.assertEqual(row["role"], "free")
        self.assertTrue(row["password_hash"].startswith("$argon2id$"))
        self.assertNotIn("correct-horse-battery", row["password_hash"])
        self.assertGreater(len(issued.session_token), 40)
        self.assertGreater(len(issued.csrf_token), 40)

        stored_session = self.database.fetch_one(
            "SELECT token_hash, csrf_token_hash, revoked_at FROM sessions WHERE user_id = ?",
            (issued.user.id,),
        )
        self.assertNotEqual(stored_session["token_hash"], issued.session_token)
        self.assertNotEqual(stored_session["csrf_token_hash"], issued.csrf_token)
        self.assertIsNone(stored_session["revoked_at"])

    def test_duplicate_registration_is_rejected(self) -> None:
        self._register()
        with self.assertRaises(AuthConflictError):
            self._register()

    def test_login_uses_same_generic_error_for_missing_user_and_bad_password(self) -> None:
        self._register()
        messages = []
        for username, password in (
            ("student01", "definitely-wrong"),
            ("missing-user", "definitely-wrong"),
        ):
            with self.assertRaises(AuthInvalidCredentialsError) as captured:
                self.service.login(
                    username=username,
                    password=password,
                    remote_address=f"192.0.2.{len(messages) + 1}",
                )
            messages.append(str(captured.exception))
        self.assertEqual(messages[0], messages[1])

    def test_login_rate_limit_uses_hashed_audit_subjects(self) -> None:
        self._register()
        for _ in range(3):
            with self.assertRaises(AuthInvalidCredentialsError):
                self.service.login(
                    username="student01",
                    password="wrong-password",
                    remote_address="198.51.100.4",
                )
        with self.assertRaises(AuthRateLimitError):
            self.service.login(
                username="student01",
                password="wrong-password",
                remote_address="198.51.100.4",
            )
        attempts = self.database.fetch_all(
            "SELECT subject_hash, address_hash FROM login_attempts WHERE kind = ?",
            ("login",),
        )
        self.assertTrue(attempts)
        serialized = repr(attempts)
        self.assertNotIn("student01", serialized)
        self.assertNotIn("198.51.100.4", serialized)
        self.assertNotIn("wrong-password", serialized)

    def test_session_refresh_preserves_csrf_and_logout_revokes_session(self) -> None:
        issued = self._register()
        view = self.service.session(issued.session_token)
        self.assertIsNotNone(view)
        self.assertEqual(view.csrf_token, issued.csrf_token)
        self.assertEqual(view.user.username, "student01")

        self.service.logout(issued.session_token, view.csrf_token)
        self.assertIsNone(self.service.session(issued.session_token))

    def test_profile_and_password_changes_require_valid_csrf_and_old_password(self) -> None:
        issued = self._register()
        with self.assertRaises(AuthCsrfError):
            self.service.update_profile(
                issued.session_token,
                "invalid-csrf",
                display_name="新昵称",
            )

        updated = self.service.update_profile(
            issued.session_token,
            issued.csrf_token,
            display_name="新昵称",
        )
        self.assertEqual(updated.display_name, "新昵称")

        with self.assertRaises(AuthInvalidCredentialsError):
            self.service.change_password(
                issued.session_token,
                issued.csrf_token,
                current_password="wrong-old-password",
                new_password="new-correct-horse-battery",
            )

        rotated = self.service.change_password(
            issued.session_token,
            issued.csrf_token,
            current_password="correct-horse-battery",
            new_password="new-correct-horse-battery",
        )
        self.assertNotEqual(rotated.session_token, issued.session_token)
        self.assertIsNone(self.service.session(issued.session_token))
        logged_in = self.service.login(
            username="student01",
            password="new-correct-horse-battery",
            remote_address="127.0.0.1",
        )
        self.assertEqual(logged_in.user.id, issued.user.id)

    def test_avatar_validation_checks_name_mime_content_and_safe_path(self) -> None:
        issued = self._register()
        avatar = AvatarUpload(
            filename="portrait.png",
            content_type="image/png",
            data=self._png_bytes(),
        )
        user = self.service.update_avatar(
            issued.session_token,
            issued.csrf_token,
            avatar,
        )
        self.assertTrue(user.avatar_path.endswith(".png"))
        avatar_file = self.service.avatar_file(user.avatar_path)
        self.assertTrue(avatar_file.is_file())
        self.assertTrue(avatar_file.is_relative_to(self.service.config.avatar_root.resolve()))

        for invalid in (
            AvatarUpload("../../escape.png", "image/png", self._png_bytes()),
            AvatarUpload("portrait.jpg", "image/jpeg", self._png_bytes()),
            AvatarUpload("portrait.png", "image/png", b"not-an-image"),
        ):
            with self.subTest(filename=invalid.filename, content_type=invalid.content_type):
                with self.assertRaises(AuthValidationError):
                    self.service.update_avatar(
                        issued.session_token,
                        issued.csrf_token,
                        invalid,
                    )


if __name__ == "__main__":
    unittest.main()
