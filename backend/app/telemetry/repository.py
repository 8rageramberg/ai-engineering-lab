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
        COUNT(DISTINCT commit_sha)                  AS commit_count,
        COALESCE(SUM(
            EXTRACT(EPOCH FROM (created_at - (metadata->>'window_started_at')::timestamptz))
        ) FILTER (
            WHERE event_type = 'coding_session_logged'
              AND metadata->>'window_started_at' IS NOT NULL
        ), 0)                                       AS total_dev_seconds
    FROM events
"""

# One row per UTC calendar day with a coding_session_logged event, summed by total_tokens --
# the raw input to the token-weighted activity calendar (colored by tokens, not commit count).
DAILY_ACTIVITY_QUERY = """
    SELECT
        (created_at AT TIME ZONE 'UTC')::date AS day,
        COALESCE(SUM(total_tokens), 0)        AS tokens
    FROM events
    WHERE event_type = 'coding_session_logged'
    GROUP BY day
    ORDER BY day
"""


def get_summary() -> dict:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(SUMMARY_QUERY)
            row = cur.fetchone()

    total_tokens, total_cost_usd, session_count, commit_count, total_dev_seconds = row
    return {
        "total_tokens": int(total_tokens),
        "total_cost_usd": float(total_cost_usd),
        "session_count": int(session_count),
        "commit_count": int(commit_count),
        "total_dev_hours": round(float(total_dev_seconds) / 3600, 1),
    }


def get_daily_activity() -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(DAILY_ACTIVITY_QUERY)
            rows = cur.fetchall()

    return [{"date": day.isoformat(), "tokens": int(tokens)} for day, tokens in rows]
