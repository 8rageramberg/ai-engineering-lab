# TELEMETRY_RULES.md

The logging contract. This is the schema every event-emitting action — application or coding-agent —
must conform to. Dirty telemetry data is the single biggest avoidable failure mode for this project;
when in doubt, follow this file exactly rather than improvising a new shape.

## Core event table (target schema, once the backend exists)
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,           -- app, manual, github, scheduled_job, mobile
  feature_area TEXT,              -- frontend, backend, infra, ai, observability, docs, todo_agent, mobile
  task_id UUID,
  commit_sha TEXT,
  model_provider TEXT,
  model_name TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd NUMERIC(12,6) DEFAULT 0,
  latency_ms INTEGER,
  success BOOLEAN,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
```

## Required event types
| event_type | source | Why it matters |
|---|---|---|
| ai_request_completed | app/backend | Token and cost accounting |
| coding_session_logged | manual/CLI | Tracks Claude/Codex usage while building |
| todo_created | app/manual | Project management timeline |
| todo_completed | app/manual/github | Links progress to commits |
| commit_pushed | github | Engineering activity |
| deploy_completed | scheduled_job/CI | Deployment frequency |
| daily_stats_aggregated | scheduled_job | Dashboard performance |
| error_recorded | app/backend | Reliability evidence |

## Required fields by event purpose
- Every event: `event_type`, `source`, `created_at` (auto), `success`.
- Cost-relevant events (`ai_request_completed`, `coding_session_logged`): `model_provider`,
  `model_name`, `input_tokens`, `output_tokens`, `total_tokens`, `estimated_cost_usd`, `latency_ms`.
- Work-tracking events (`todo_*`, `commit_pushed`): `feature_area`, `task_id` when available,
  `commit_sha` when available.
- Failures (`error_recorded`): `feature_area`, `success=false`, and the error message in `metadata`.

## Controlled vocabularies (use exactly these values)
`feature_area`: frontend | backend | infra | ai | observability | docs | todo_agent | mobile

`session_type`: coding | debugging | architecture | writing | review | planning | other

`source`: app | manual | github | scheduled_job | mobile | git_hook | session_end

`model_provider`: anthropic | openai | local | other

Do not introduce new values ad hoc. If a new category is genuinely needed, propose it via
[docs/decisions/DECISIONS.md](../docs/decisions/DECISIONS.md) and update this file, AGENTS.md, and
CLAUDE.md together so the vocabularies never drift apart.

## Coding-agent session logging
`coding_session_logged` events can come from two paths:
- **Manual** (`source: manual`) — log a meaningful session by hand via `scripts/log_ai_session.py`,
  for sessions that don't end in a commit. Captures: provider, model, session_type, feature_area,
  task_id (optional), prompt_count, input/output tokens (optional), cost_estimate_usd (optional),
  summary, changed_files (optional).
- **Automatic** (`source: git_hook`) — a local `post-commit` git hook
  (`scripts/git-hooks/post-commit`) appends one row per commit with zero typed input, deriving
  `commit_sha`, `feature_area`, `summary` (= commit message), `changed_files`, and timestamps from
  git, plus best-effort token enrichment from the local Claude Code transcript directory. This is
  the primary path going forward; the manual logger remains a fallback.

Both paths use the same `coding_session_logged` shape and add two extra fields beyond the core
event table:
- `message_count` (integer, like `prompt_count` but counting agent turns/`Stop` events rather than
  user prompts). Populated by the `git_hook` path via the `.ai/session_counter.json` accumulator;
  may be `null` for manually logged events.
- `cache_read_tokens` (integer) — prompt-cache hits ("Input Cache (Hit)"), reported separately from
  `input_tokens`/`total_tokens` because they are priced roughly 10x cheaper than fresh input and
  would otherwise dwarf the "work effort" the token figures are meant to proxy. `total_tokens` is
  `input_tokens + output_tokens + cache_creation_input_tokens` (cache *writes* count as real model
  work; cache *reads* do not). `estimated_cost_usd` prices each of the four usage categories — input,
  output, cache write, cache read — at its own per-million rate before summing, rather than blending
  them into one rate (blending previously inflated cost estimates roughly 5x). `cache_read_tokens`
  may be `null`/`0` when enrichment is unavailable, same as the other token fields.

One short log per meaningful session is enough — this is what keeps the dashboard's early data honest.

## Data quality guardrails
- Prefer controlled-vocabulary fields over free text wherever a structured field exists.
- Never leave `feature_area` or `source` blank on an event that represents real work.
- If an event doesn't fit an existing `event_type`, don't force it — propose a new type via a
  decision entry rather than overloading `metadata` with inconsistent shapes.
