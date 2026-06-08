# DECISIONS

Append-only architecture and scope decision log. Record any decision that changes the product
direction, stack, MVP boundaries, controlled vocabularies, or event schema — these are exactly the
things that, if changed silently, would make historical telemetry data inconsistent with current
data.

Add new entries at the top, newest first.

## Entry format

```
### YYYY-MM-DD — short title
- decision: what was decided
- why: the reasoning / problem it solves
- alternatives considered: what else was on the table, and why it lost
- impact: what this changes (schema, vocab, scope, stack, etc.)
- feature_area: frontend | backend | infra | ai | observability | docs | todo_agent | mobile
```

## Entries

### 2026-06-08 — Stand up the local-first MVP skeleton (frontend, backend, Postgres, dashboard)
- decision: Build the first running skeleton per the replaceable-components principle:
  a Next.js + Tailwind frontend (`frontend/`) that talks to FastAPI (`backend/`) only via
  documented HTTP/JSON endpoints (`frontend/src/lib/api.ts` → `/api/health`,
  `/api/telemetry/summary`); a FastAPI backend that accesses Postgres only through a
  data-access seam (`backend/app/db/connection.py` + `backend/app/telemetry/repository.py`,
  not raw queries in route handlers); a stubbed single AI wrapper
  (`backend/app/ai/client.py`, interface only, `NotImplementedError` body); and
  `docker-compose.yml` wiring all three together with config (DB URL, CORS origins, API
  base URLs) entirely in env vars. For the `events` migration, chose hand-rolled numbered
  SQL files (`backend/migrations/*.sql` + a tiny `migrate.py` runner with a
  `schema_migrations` tracking table) over Alembic.
- why: The task explicitly called for clean seams so each piece (frontend, backend, DB)
  could be swapped without rewriting the others — matching CLAUDE.md's
  "replaceable components" principle and the "modular, no overengineering" philosophy in
  PROJECT_CONTEXT.md. For migrations specifically: the schema is one table with no ORM
  models anywhere in the app, so Alembic's env.py/versioning machinery would be pure
  ceremony at this size — a "boring tool" that matches the project's actual complexity was
  preferred, with a note to revisit if/when the schema grows branches or needs downgrades.
- alternatives considered:
  - Alembic for migrations — rejected for now as overkill for a single-table schema with no
    SQLAlchemy models in the app; would add a dependency and config surface with no payoff
    yet. Revisit if the schema grows complex enough to need branching/downgrades.
  - Frontend calling Postgres directly or importing backend internals — rejected; violates
    the documented-API-contract requirement and would make the backend unswappable.
  - A single `NEXT_PUBLIC_API_BASE_URL` for both server- and client-rendered fetches —
    rejected after discovering it breaks in docker compose: server components run inside
    the frontend container and must reach the backend over the compose network
    (`http://backend:8000`), while the browser runs on the host and needs the published
    port (`http://localhost:8000`). Split into `API_BASE_URL` (server-side/internal,
    compose-only) and `NEXT_PUBLIC_API_BASE_URL` (browser-facing), selected at runtime by
    `typeof window === "undefined"` in `frontend/src/lib/api.ts`.
- impact: Establishes the on-disk layout and seams `frontend/`, `backend/app/{db,telemetry,ai}/`,
  `backend/migrations/` + `migrate.py`, and `docker-compose.yml` follow going forward. Creates
  the `events` table per `.ai/TELEMETRY_RULES.md` and a `schema_migrations` tracking table.
  Adds `backend/seed.py`, which loads `docs/worklog/ai_sessions.jsonl` into `events` —
  columns matching the core schema map directly, everything else
  (`session_type`, `prompt_count`, `message_count`, `cache_read_tokens`, `summary`,
  `changed_files`) folds into `metadata` JSONB. Updates `.ai/PROJECT_CONTEXT.md` (stage,
  stack section now reflects what exists) and `AGENTS.md` (setup commands, repo map,
  architecture rules) to match reality. No controlled-vocabulary or event-schema changes.
- feature_area: infra

### 2026-06-07 — Add `git_hook` as a distinct telemetry source
- decision: Add `git_hook` to the controlled `source` vocabulary (`.ai/TELEMETRY_RULES.md`,
  `AGENTS.md`, `CLAUDE.md`) for `coding_session_logged` events that are appended automatically by
  a local `post-commit` git hook, and add a `message_count` field alongside the existing
  `prompt_count` to the `coding_session_logged` shape.
- why: Automatic, commit-triggered telemetry is fired by a local script with no human typing and no
  GitHub round-trip — it is neither `manual` (human-typed via `scripts/log_ai_session.py`) nor
  `github` (remote/PR-based). Collapsing it into either existing value would make it impossible to
  later tell which rows were typed by a person, which came from GitHub activity, and which were
  emitted unattended by a local hook — exactly the kind of ambiguity this project's telemetry rules
  exist to prevent.
- alternatives considered:
  - Reusing `manual` — rejected because these events involve no typed input at commit time; lumping
    them together would hide how much of the worklog is unattended versus human-curated.
  - Reusing `github` — rejected because this fires from a local git hook on the developer's machine,
    not from GitHub's API or a webhook; no remote system is involved.
- impact: `source` vocabulary gains `git_hook`; `coding_session_logged` events gain an optional
  `message_count` field (counts agent turns/`Stop` events, mirrors `prompt_count`). Updates
  `.ai/TELEMETRY_RULES.md`, `AGENTS.md`, and `CLAUDE.md` together so the vocabularies stay in sync.
- feature_area: observability

### 2026-06-07 — Use project-owned telemetry as source of truth
- decision: The project will not build analytics directly on Claude Code internal logs. Coding-agent
  usage will be logged through a project-owned session logger. Application AI calls will be logged
  through the backend AI wrapper. Claude local logs may only be used as optional human cross-checks.
- why: We investigated Claude Code local logs and found that they are useful for personal debugging
  but not safe or stable enough to use as the system of record.
- alternatives considered: Building the dashboard's analytics pipeline directly on Claude Code's
  local session transcripts (`~/.claude/projects/*.jsonl`) — rejected for the reasons below.
- impact:
  - Claude logs are path-based and may fragment if the repo moves.
  - Claude logs include raw prompts, file contents, and tool I/O.
  - Claude log schema is undocumented and may change.
  - Claude logs do not include feature_area, task_id, session_type, or cost.
  - Project-owned logging gives cleaner long-term telemetry.

  Consequences: slightly more manual logging early on, but much cleaner data quality, a safer
  public dashboard, and easier long-term analytics.
- feature_area: observability

### 2026-06-07 — Establish project control layer before app code
- decision: Create AGENTS.md, CLAUDE.md, .ai/ contracts, and docs/worklog + docs/decisions before
  writing any frontend, backend, Terraform, or migration code.
- why: Per the Agent Operating System Blueprint, dirty early telemetry data is the biggest avoidable
  failure mode. Establishing shared controlled vocabularies and logging contracts up front ensures
  Claude Code and Codex categorize all future work consistently from the very first commit.
- alternatives considered: Writing app code first and retrofitting documentation/telemetry rules
  later — rejected because retrofitting consistent categorization onto inconsistent historical data
  is far harder than starting clean.
- impact: Defines the canonical locations and contents for all control-layer docs. Establishes
  `feature_area`, `session_type`, `source`, and `model_provider` as the controlled vocabularies used
  everywhere (AGENTS.md, CLAUDE.md, .ai/TELEMETRY_RULES.md, worklog, and the future events table).
- feature_area: docs

### 2026-06-07 — Remove duplicate root-level DECISIONS.md and TASK_TEMPLATE.md
- decision: Delete the empty `/DECISIONS.md` and `/TASK_TEMPLATE.md` files at the repo root.
- why: They were empty duplicates of the canonical files at `docs/decisions/DECISIONS.md` and
  `.ai/TASK_TEMPLATE.md`. Keeping both would risk agents updating the wrong copy and splitting the
  decision/task history across two locations.
- alternatives considered: Keeping both and redirecting one to the other — rejected as unnecessary
  complexity; a single canonical location per document is simpler and matches the blueprint's target
  repository layout.
- impact: One canonical location per document; no content was lost (both were empty).
- feature_area: docs
