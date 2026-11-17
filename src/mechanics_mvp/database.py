"""Small DB-API adapter with traceable SQLite/PostgreSQL migrations."""

from __future__ import annotations

import re
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator, Sequence


DEFAULT_MIGRATIONS = Path(__file__).with_name("migrations")


class DatabaseConfigurationError(RuntimeError):
    """Raised when the configured database URL cannot be used."""


class Database:
    def __init__(self, url: str, *, migrations_dir: Path | None = None) -> None:
        self.url = str(url).strip()
        self.migrations_dir = (migrations_dir or DEFAULT_MIGRATIONS).resolve()
        self.kind, self.location = self._parse_url(self.url)

    @staticmethod
    def _parse_url(url: str) -> tuple[str, str]:
        if url.startswith("sqlite:///"):
            location = url.removeprefix("sqlite:///")
            if re.match(r"^/[A-Za-z]:/", location):
                location = location[1:]
            if not location:
                raise DatabaseConfigurationError("SQLite database path is empty.")
            return "sqlite", location
        if url.startswith(("postgresql://", "postgres://")):
            return "postgresql", url
        raise DatabaseConfigurationError("DATABASE_URL must use sqlite:/// or postgresql://.")

    def _connect(self):
        if self.kind == "sqlite":
            path = Path(self.location)
            if self.location != ":memory:":
                path.parent.mkdir(parents=True, exist_ok=True)
            connection = sqlite3.connect(path, timeout=5.0)
            connection.row_factory = sqlite3.Row
            connection.execute("PRAGMA foreign_keys = ON")
            connection.execute("PRAGMA busy_timeout = 5000")
            if self.location != ":memory:":
                connection.execute("PRAGMA journal_mode = WAL")
            return connection

        try:
            import psycopg
            from psycopg.rows import dict_row
        except ImportError as exc:  # pragma: no cover - exercised in production setup.
            raise DatabaseConfigurationError(
                "PostgreSQL requires psycopg[binary]>=3.2."
            ) from exc
        return psycopg.connect(self.location, row_factory=dict_row)

    def _sql(self, statement: str) -> str:
        return statement if self.kind == "sqlite" else statement.replace("?", "%s")

    @contextmanager
    def transaction(self, *, immediate: bool = False) -> Iterator[Any]:
        """Yield a DB-API connection; commit on success, rollback on error.

        With ``immediate=True`` the transaction takes the database write lock
        BEFORE any read inside it (SQLite ``BEGIN IMMEDIATE``; on PostgreSQL
        an exclusive lock on ``login_attempts``), so a check-then-insert
        gate (e.g. the login/register rate limits) is serialized across
        concurrent threads instead of racing.
        """

        connection = self._connect()
        try:
            if immediate and self.kind == "sqlite":
                connection.execute("BEGIN IMMEDIATE")
            elif immediate and self.kind == "postgresql":
                connection.execute("LOCK TABLE login_attempts IN EXCLUSIVE MODE")
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def execute_on(
        self,
        connection: Any,
        statement: str,
        parameters: Sequence[Any] = (),
    ) -> Any:
        return connection.execute(self._sql(statement), tuple(parameters))

    def fetch_one_on(
        self,
        connection: Any,
        statement: str,
        parameters: Sequence[Any] = (),
    ) -> dict[str, Any] | None:
        cursor = self.execute_on(connection, statement, parameters)
        row = cursor.fetchone()
        return dict(row) if row is not None else None

    def fetch_all_on(
        self,
        connection: Any,
        statement: str,
        parameters: Sequence[Any] = (),
    ) -> list[dict[str, Any]]:
        cursor = self.execute_on(connection, statement, parameters)
        return [dict(row) for row in cursor.fetchall()]

    def fetch_one(
        self,
        statement: str,
        parameters: Sequence[Any] = (),
    ) -> dict[str, Any] | None:
        with self.transaction() as connection:
            return self.fetch_one_on(connection, statement, parameters)

    def fetch_all(
        self,
        statement: str,
        parameters: Sequence[Any] = (),
    ) -> list[dict[str, Any]]:
        with self.transaction() as connection:
            return self.fetch_all_on(connection, statement, parameters)

    @staticmethod
    def is_integrity_error(error: BaseException) -> bool:
        if isinstance(error, sqlite3.IntegrityError):
            return True
        return error.__class__.__module__.startswith("psycopg") and error.__class__.__name__ in {
            "IntegrityError",
            "UniqueViolation",
            "ForeignKeyViolation",
        }

    def migrate(self) -> None:
        if not self.migrations_dir.is_dir():
            raise DatabaseConfigurationError(
                f"Migration directory does not exist: {self.migrations_dir}"
            )

        with self.transaction() as connection:
            self.execute_on(
                connection,
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version TEXT PRIMARY KEY,
                    applied_at TEXT NOT NULL
                )
                """,
            )
            applied = {
                row["version"]
                for row in self.fetch_all_on(
                    connection,
                    "SELECT version FROM schema_migrations",
                )
            }

        for migration in sorted(self.migrations_dir.glob("[0-9][0-9][0-9][0-9]_*.sql")):
            if migration.name in applied:
                continue
            statements = [
                statement.strip()
                for statement in migration.read_text(encoding="utf-8").split(";")
                if statement.strip()
            ]
            with self.transaction() as connection:
                for statement in statements:
                    self.execute_on(connection, statement)
                self.execute_on(
                    connection,
                    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
                    (migration.name, _utc_timestamp()),
                )


def _utc_timestamp() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
