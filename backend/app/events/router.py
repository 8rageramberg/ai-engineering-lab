"""Internal-only event ingestion endpoint.

Accepts structured event rows from trusted callers that cannot write to
Neon directly (e.g. GitHub Actions after a successful deploy). Protected
by a shared secret header — never callable from the public internet without it.

Per TELEMETRY_RULES.md the event_type vocabulary is fixed; any unknown
value is still stored (useful for future event types during development)
but callers should only send values from the controlled list.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.config import INTERNAL_API_SECRET
from app.db.connection import get_connection

router = APIRouter()


class InternalEventPayload(BaseModel):
    event_type: str
    source: str
    commit_sha: Optional[str] = None
    feature_area: Optional[str] = None
    metadata: dict = {}


@router.post("/api/events/internal", status_code=201)
def receive_internal_event(
    payload: InternalEventPayload,
    x_internal_secret: str = Header(None),
):
    """Accept a structured event from a trusted internal caller.

    Auth: X-Internal-Secret header must match INTERNAL_API_SECRET env var.
    A missing or wrong secret returns 403 with no other information — callers
    should not be able to distinguish "wrong secret" from "endpoint not found".
    """
    if not INTERNAL_API_SECRET or x_internal_secret != INTERNAL_API_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    row_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO events (
                    id, created_at, event_type, source, feature_area,
                    commit_sha,
                    input_tokens, output_tokens, total_tokens,
                    estimated_cost_usd, success, metadata
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s,
                    0, 0, 0,
                    0, true, %s
                )
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    row_id,
                    now,
                    payload.event_type,
                    payload.source,
                    payload.feature_area,
                    payload.commit_sha,
                    json.dumps(payload.metadata),
                ),
            )
        conn.commit()

    return {"id": row_id, "event_type": payload.event_type, "status": "recorded"}
