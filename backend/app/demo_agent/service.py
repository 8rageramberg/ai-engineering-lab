"""Orchestration for POST /api/ask — the project's first live, public-facing AI feature.

This is exactly the "App demo agent (in-repo, public-facing)" row in
TOKEN_BUDGET.md: cheap model by default, hard input/output limits, and a rate
limit, all non-negotiable. Every constraint below exists to keep a visitor
from turning a portfolio demo into either a real bill or a general-purpose
chat endpoint:

- The model is fixed to gpt-4o-mini (enforced in app/ai/client.py, not here).
- The question has a hard length cap; absurdly long input is rejected outright.
- The answer has a hard token cap at the provider AND a character backstop.
- A small in-memory rate limiter caps how often the endpoint can be invoked at
  all — no per-visitor spend can run away unnoticed.
- The agent only ever sees one fixed, pre-shaped data snapshot (see
  repository.get_agent_context) and is told in the system prompt to answer
  from that data alone — it cannot run arbitrary queries or discuss anything
  else, by construction, not just by instruction.

Every real call still flows through the same `events` table the telemetry
dashboard reads from: it emits a real `ai_request_completed` row with real
token/cost numbers, closing the loop between "we say we measure AI usage" and
"here is a feature that visibly does."
"""

import json
import threading
import time

from app.ai import client as ai_client
from app.db.connection import get_connection
from app.demo_agent import repository

# Hard input cap — rejects rather than silently truncates, so the visitor
# knows this is a "short bounded question" feature, not a text box for essays.
MAX_QUESTION_LENGTH = 300

# Stamped into every event this agent emits (metadata.agent_name) so usage can
# be aggregated cleanly for *this* agent specifically — separate from any other
# in-app AI feature that might exist later, and from the coding-agent layer's
# `coding_session_logged` events (source: git_hook), per PROJECT_CONTEXT.md's
# "two agent layers, do not merge early" rule.
AGENT_NAME = "demo_agent"

# Hard output caps: a provider-side token ceiling (what actually bounds cost)
# plus a character backstop on the returned text (what guarantees the UI shows
# a glanceable one-liner even if the model ignores the instruction to be terse).
MAX_OUTPUT_TOKENS = 80
MAX_ANSWER_LENGTH = 320

# Global, in-memory, fixed-window rate limit. No Redis, no per-visitor identity
# tracking — just a hard ceiling on how often this single-instance app will
# place a real call, which is all a local-first portfolio demo needs per
# AGENT_CONTRACT.md's MVP boundaries.
RATE_LIMIT_MAX_REQUESTS = 5
RATE_LIMIT_WINDOW_SECONDS = 60

# gpt-4o-mini list pricing (USD per million tokens) — enrichment only, the same
# "estimate, not an invoice" spirit as the post-commit hook's pricing constants.
# May drift; check against OpenAI's pricing page periodically.
INPUT_USD_PER_MTOK = 0.15
OUTPUT_USD_PER_MTOK = 0.60

SYSTEM_PROMPT = """You are a small, narrowly-scoped assistant embedded in an AI engineering portfolio project.

Your ONLY job is to answer short questions about THIS PROJECT'S OWN telemetry — \
how it was built, how many sessions/commits/tokens/dollars went into it, which \
sessions cost what, and similar facts — using ONLY the JSON data block below.

Rules, all mandatory:
- Answer in one short sentence, no more than about 30 words.
- Base your answer strictly on the provided data. Never guess, estimate, or invent a number that isn't in it.
- If the data doesn't contain enough to answer, say so plainly in one sentence — do not speculate.
- Refuse, in one short sentence, anything that isn't a question about this project's telemetry data (no general knowledge, opinions, code, or other topics).

DATA (the complete set of facts you may draw on):
{context_json}
"""


class InvalidQuestion(ValueError):
    pass


class RateLimited(RuntimeError):
    pass


_rate_limit_lock = threading.Lock()
_rate_limit_window_started_at = 0.0
_rate_limit_count = 0


def _check_rate_limit() -> None:
    global _rate_limit_window_started_at, _rate_limit_count

    now = time.monotonic()
    with _rate_limit_lock:
        if now - _rate_limit_window_started_at >= RATE_LIMIT_WINDOW_SECONDS:
            _rate_limit_window_started_at = now
            _rate_limit_count = 0

        if _rate_limit_count >= RATE_LIMIT_MAX_REQUESTS:
            raise RateLimited(
                f"This demo allows at most {RATE_LIMIT_MAX_REQUESTS} questions per "
                f"{RATE_LIMIT_WINDOW_SECONDS} seconds — try again shortly."
            )

        _rate_limit_count += 1


INSERT_EVENT_SQL = """
    INSERT INTO events (
        event_type, source, feature_area, model_provider, model_name,
        input_tokens, output_tokens, total_tokens, estimated_cost_usd,
        latency_ms, success, metadata
    ) VALUES (
        %(event_type)s, %(source)s, %(feature_area)s, %(model_provider)s, %(model_name)s,
        %(input_tokens)s, %(output_tokens)s, %(total_tokens)s, %(estimated_cost_usd)s,
        %(latency_ms)s, %(success)s, %(metadata)s
    )
"""


def _record_event(response: ai_client.AIResponse, latency_ms: int) -> None:
    total_tokens = response.input_tokens + response.output_tokens
    estimated_cost_usd = round(
        (
            response.input_tokens * INPUT_USD_PER_MTOK
            + response.output_tokens * OUTPUT_USD_PER_MTOK
        )
        / 1_000_000,
        6,
    )

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                INSERT_EVENT_SQL,
                {
                    "event_type": "ai_request_completed",
                    "source": "app",
                    "feature_area": "ai",
                    "model_provider": response.model_provider,
                    "model_name": response.model_name,
                    "input_tokens": response.input_tokens,
                    "output_tokens": response.output_tokens,
                    "total_tokens": total_tokens,
                    "estimated_cost_usd": estimated_cost_usd,
                    "latency_ms": latency_ms,
                    "success": True,
                    "metadata": json.dumps({"endpoint": "/api/ask", "agent_name": AGENT_NAME}),
                },
            )
        conn.commit()


def ask(question: str) -> dict:
    """Validate, ground, and answer one bounded question — emitting a real
    ai_request_completed event for every live model call that completes."""
    question = (question or "").strip()
    if not question:
        raise InvalidQuestion("Ask a question first.")
    if len(question) > MAX_QUESTION_LENGTH:
        raise InvalidQuestion(f"Keep questions under {MAX_QUESTION_LENGTH} characters.")

    _check_rate_limit()

    context = repository.get_agent_context()
    system_prompt = SYSTEM_PROMPT.format(context_json=json.dumps(context, default=str))

    started_at = time.monotonic()
    response = ai_client.complete(question, system=system_prompt, max_output_tokens=MAX_OUTPUT_TOKENS)
    latency_ms = int((time.monotonic() - started_at) * 1000)

    _record_event(response, latency_ms)

    answer = response.text.strip()
    if len(answer) > MAX_ANSWER_LENGTH:
        answer = answer[:MAX_ANSWER_LENGTH].rstrip() + "…"

    return {"answer": answer}


def get_usage_stats() -> dict:
    """This agent's own lifetime usage — questions answered, tokens, cost —
    aggregated straight from the ai_request_completed events it has emitted.
    Powers the small usage strip on the demo agent page: real numbers from the
    same pipeline the telemetry dashboard reads, not a separate counter."""
    return repository.get_agent_usage_stats(AGENT_NAME)
