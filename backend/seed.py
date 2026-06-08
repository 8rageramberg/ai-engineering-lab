"""Seed `events` with the real coding_session_logged history from the worklog.

Reads docs/worklog/ai_sessions.jsonl (the project's own append-only telemetry
record — see .ai/TELEMETRY_RULES.md) and inserts one row per line, so the
dashboard shows real numbers from day one instead of placeholders. Idempotent:
re-running skips rows whose id is already present.

Columns that exist on the core `events` table are mapped directly; everything
else the worklog captures (session_type, prompt_count, message_count,
cache_read_tokens, summary, changed_files) is folded into `metadata` JSONB —
that's exactly the kind of flexible, schema-light data JSONB is for.
"""

import json
import os
from pathlib import Path

from app.db.connection import get_connection

DEFAULT_WORKLOG_PATH = Path(__file__).parent.parent / "docs" / "worklog" / "ai_sessions.jsonl"
WORKLOG_PATH = Path(os.environ.get("WORKLOG_PATH", DEFAULT_WORKLOG_PATH))

CORE_FIELDS = {
    "id",
    "created_at",
    "event_type",
    "source",
    "feature_area",
    "task_id",
    "commit_sha",
    "model_provider",
    "model_name",
    "input_tokens",
    "output_tokens",
    "total_tokens",
    "estimated_cost_usd",
    "latency_ms",
    "success",
}

INSERT = """
    INSERT INTO events (
        id, created_at, event_type, source, feature_area, task_id, commit_sha,
        model_provider, model_name, input_tokens, output_tokens, total_tokens,
        estimated_cost_usd, latency_ms, success, metadata
    )
    VALUES (
        %(id)s, %(created_at)s, %(event_type)s, %(source)s, %(feature_area)s,
        %(task_id)s, %(commit_sha)s, %(model_provider)s, %(model_name)s,
        %(input_tokens)s, %(output_tokens)s, %(total_tokens)s,
        %(estimated_cost_usd)s, %(latency_ms)s, %(success)s, %(metadata)s
    )
    ON CONFLICT (id) DO NOTHING
"""


def to_row(record: dict) -> dict:
    extra = {k: v for k, v in record.items() if k not in CORE_FIELDS}
    metadata = {**extra.pop("metadata", {}), **extra}

    row = {field: record.get(field) for field in CORE_FIELDS}
    row.setdefault("success", True)
    if row["success"] is None:
        row["success"] = True
    row["metadata"] = json.dumps(metadata)
    return row


def run():
    if not WORKLOG_PATH.exists():
        raise SystemExit(f"worklog not found at {WORKLOG_PATH}")

    rows = [to_row(json.loads(line)) for line in WORKLOG_PATH.read_text().splitlines() if line.strip()]

    with get_connection() as conn:
        with conn.cursor() as cur:
            for row in rows:
                cur.execute(INSERT, row)
        conn.commit()

    print(f"seeded {len(rows)} events from {WORKLOG_PATH}")


if __name__ == "__main__":
    run()
