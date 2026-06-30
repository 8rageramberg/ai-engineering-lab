"""Data-access layer for the `events` table.

Route handlers call into this module rather than writing raw SQL inline —
this is the seam that lets Postgres be swapped later without touching API
route logic, per the replaceable-components principle in CLAUDE.md.
"""

from app.db.connection import get_connection

# One-time, hand-supplied estimate of day-one work (the four 2026-06-07 sessions), made
# before `window_started_at` existed to measure session duration -- that field was added
# on day two (2026-06-08), so those earlier rows have no recorded start time and never will.
# This number does not get recomputed; it is a fixed offset whose share of the displayed
# total shrinks on its own as more precisely-tracked hours accumulate on top of it.
PRE_TRACKING_HOURS_ESTIMATE = 3.0

SUMMARY_QUERY = """
    SELECT
        COALESCE(SUM(total_tokens), 0)              AS total_tokens,
        COALESCE(SUM(estimated_cost_usd), 0)        AS total_cost_usd,
        COUNT(*) FILTER (WHERE event_type = 'coding_session_logged') AS session_count,
        COUNT(DISTINCT commit_sha)                  AS commit_count,
        COALESCE(SUM(
            (metadata->>'prompt_count')::int
        ) FILTER (
            WHERE event_type = 'coding_session_logged'
              AND metadata->>'prompt_count' IS NOT NULL
        ), 0)                                       AS total_prompt_count,
        COALESCE(SUM(
            EXTRACT(EPOCH FROM (created_at - (metadata->>'window_started_at')::timestamptz))
        ) FILTER (
            WHERE event_type = 'coding_session_logged'
              AND metadata->>'window_started_at' IS NOT NULL
        ), 0)                                       AS tracked_dev_seconds
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

    (
        total_tokens, total_cost_usd, session_count, commit_count,
        total_prompt_count, tracked_dev_seconds,
    ) = row

    tracked_hours = float(tracked_dev_seconds) / 3600
    return {
        "total_tokens": int(total_tokens),
        "total_cost_usd": float(total_cost_usd),
        "session_count": int(session_count),
        "commit_count": int(commit_count),
        "total_prompt_count": int(total_prompt_count),
        "tracked_dev_hours": round(tracked_hours, 1),
        "total_dev_hours_estimate": round(PRE_TRACKING_HOURS_ESTIMATE + tracked_hours, 1),
    }


def get_daily_activity() -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(DAILY_ACTIVITY_QUERY)
            rows = cur.fetchall()

    return [{"date": day.isoformat(), "tokens": int(tokens)} for day, tokens in rows]


DEPLOYS_SUMMARY_QUERY = """
    SELECT
        COUNT(*)                                                         AS total_deploys,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS deploys_last_7_days,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day')  AS deploys_last_24h
    FROM events
    WHERE event_type = 'commit_pushed'
"""

RECENT_DEPLOYS_QUERY = """
    SELECT
        id,
        created_at,
        commit_sha,
        metadata->>'commit_message' AS commit_message,
        metadata->>'actor'          AS actor,
        metadata->>'branch'         AS branch,
        metadata->>'workflow_run_id' AS workflow_run_id
    FROM events
    WHERE event_type = 'commit_pushed'
    ORDER BY created_at DESC
    LIMIT 10
"""


def get_deploys() -> dict:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(DEPLOYS_SUMMARY_QUERY)
            summary_row = cur.fetchone()
            cur.execute(RECENT_DEPLOYS_QUERY)
            recent_rows = cur.fetchall()

    total, last_7d, last_24h = summary_row
    recent = [
        {
            "id": str(row_id),
            "created_at": created_at.isoformat(),
            "commit_sha": commit_sha[:7] if commit_sha else None,
            "commit_sha_full": commit_sha,
            "commit_message": commit_message,
            "actor": actor,
            "branch": branch,
            "workflow_run_id": workflow_run_id,
        }
        for row_id, created_at, commit_sha, commit_message, actor, branch, workflow_run_id in recent_rows
    ]

    return {
        "total_deploys": int(total),
        "deploys_last_7_days": int(last_7d),
        "deploys_last_24h": int(last_24h),
        "recent": recent,
    }
