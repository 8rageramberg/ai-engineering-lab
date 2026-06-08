"""Data-access layer for the `events` table.

Route handlers call into this module rather than writing raw SQL inline —
this is the seam that lets Postgres be swapped later without touching API
route logic, per the replaceable-components principle in CLAUDE.md.
"""

from app.db.connection import get_connection

SUMMARY_QUERY = """
    SELECT
        COALESCE(SUM(total_tokens), 0)              AS total_tokens,
        COALESCE(SUM(estimated_cost_usd), 0)        AS total_cost_usd,
        COUNT(*) FILTER (WHERE event_type = 'coding_session_logged') AS session_count,
        COUNT(DISTINCT commit_sha)                  AS commit_count
    FROM events
"""


def get_summary() -> dict:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(SUMMARY_QUERY)
            row = cur.fetchone()

    total_tokens, total_cost_usd, session_count, commit_count = row
    return {
        "total_tokens": int(total_tokens),
        "total_cost_usd": float(total_cost_usd),
        "session_count": int(session_count),
        "commit_count": int(commit_count),
    }
