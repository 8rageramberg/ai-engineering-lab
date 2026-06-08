"""Data-access layer for the demo agent's grounding context.

Deliberately a single, fixed, bounded query — not a general-purpose query
function the agent could be steered into misusing. Per AGENT_CONTRACT.md and
TOKEN_BUDGET.md, the public-facing demo agent must be constrained at the code
level too: it can only ever see this one small, pre-shaped snapshot of the
project's own `events` data, never run arbitrary SQL.
"""

from app.db.connection import get_connection
from app.telemetry.repository import get_summary

# Most recent N coding sessions, newest first — enough rows for the agent to
# answer "which session cost the most / how many commits this week / what was
# the last thing built" style questions while staying small enough to embed
# directly in a prompt with a predictable token cost.
RECENT_SESSIONS_LIMIT = 20

RECENT_SESSIONS_QUERY = """
    SELECT
        (created_at AT TIME ZONE 'UTC')::date AS day,
        commit_sha,
        metadata->>'summary'                  AS summary,
        total_tokens,
        estimated_cost_usd,
        COALESCE((metadata->>'prompt_count')::int, 0) AS prompt_count
    FROM events
    WHERE event_type = 'coding_session_logged'
    ORDER BY created_at DESC
    LIMIT %(limit)s
"""


def _get_recent_sessions() -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(RECENT_SESSIONS_QUERY, {"limit": RECENT_SESSIONS_LIMIT})
            rows = cur.fetchall()

    return [
        {
            "date": day.isoformat(),
            "commit_sha": commit_sha,
            "summary": summary,
            "total_tokens": int(total_tokens),
            "estimated_cost_usd": float(estimated_cost_usd),
            "prompt_count": int(prompt_count),
        }
        for day, commit_sha, summary, total_tokens, estimated_cost_usd, prompt_count in rows
    ]


def get_agent_context() -> dict:
    """The complete, fixed snapshot of project telemetry the agent is allowed to see.

    Combines the same project-wide summary the dashboard displays with a
    bounded list of recent sessions — enough for grounded one-line answers,
    nothing that opens the door to free-form querying.
    """
    return {
        "project_summary": get_summary(),
        "recent_coding_sessions_newest_first": _get_recent_sessions(),
    }
