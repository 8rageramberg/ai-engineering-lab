"""Hand-rolled SQL migration runner.

Chosen over Alembic for this stage: there is exactly one table, no ORM models
exist anywhere in the app, and a one-table schema doesn't justify Alembic's
env.py/versioning machinery. Migrations are plain numbered .sql files in
migrations/, applied in order, tracked in a `schema_migrations` table. If the
schema grows complex enough to need branching/downgrades, revisit and adopt
Alembic then (see DECISIONS.md).
"""

from pathlib import Path

from app.db.connection import get_connection

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def run():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"
            )
            cur.execute("SELECT filename FROM schema_migrations")
            applied = {row[0] for row in cur.fetchall()}

            for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
                if path.name in applied:
                    continue
                print(f"applying {path.name}")
                cur.execute(path.read_text())
                cur.execute("INSERT INTO schema_migrations (filename) VALUES (%s)", (path.name,))
        conn.commit()


if __name__ == "__main__":
    run()
