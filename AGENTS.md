# AGENTS.md

Generic onboarding for any coding agent working in this repository (Claude Code, Codex, Copilot, or other).

## Project goal
Build a cloud-based AI engineering portfolio platform with clean telemetry, low cost, and a polished MVP.
See [.ai/PROJECT_CONTEXT.md](.ai/PROJECT_CONTEXT.md) for the full product summary.

## Setup commands
Run the whole stack locally with docker compose:
```
docker compose up -d --build
docker compose exec backend python migrate.py   # apply SQL migrations (one-time / on schema change)
docker compose exec backend python seed.py      # load docs/worklog/ai_sessions.jsonl into events
```
- Landing page: http://localhost:3000
- Telemetry dashboard: http://localhost:3000/dashboard
- Backend health check: http://localhost:8000/api/health
- Backend telemetry summary: http://localhost:8000/api/telemetry/summary

One-time, per-clone: point git at the repo's versioned hooks so commits are logged automatically
(see [Commit-driven telemetry](#commit-driven-telemetry) below):
```
git config core.hooksPath scripts/git-hooks
```

## Commit-driven telemetry
Every commit on a clone with `core.hooksPath` set as above runs
[scripts/git-hooks/post-commit](scripts/git-hooks/post-commit), which logs one
`coding_session_logged` row (source `git_hook`) automatically — deriving `commit_sha`,
`feature_area`, `summary` (the commit message), `changed_files`, and best-effort token counts, with
zero typed input. It dual-writes that row: appending it to `docs/worklog/ai_sessions.jsonl` (the
durable, human-auditable system of record) and inserting it directly into the live `events` table
(via `docker compose exec postgres psql`, so the dashboard reflects the commit immediately with no
manual reseed). It never blocks or fails a commit; on any error in either path it degrades to
nulls/a stderr warning rather than a non-zero exit. `scripts/log_ai_session.py` remains available as
a manual fallback for meaningful sessions that don't end in a commit.

## Repo map (current)
- `AGENTS.md` — this file, generic agent onboarding
- `CLAUDE.md` — Claude Code session memory and rules
- `.ai/` — stricter internal contracts every agent must read before meaningful work
- `frontend/` — Next.js + Tailwind app (landing page, telemetry dashboard)
- `backend/` — FastAPI app (`app/main.py`), data-access layer (`app/db/`,
  `app/telemetry/`), AI wrapper stub (`app/ai/client.py`), SQL migrations
  (`migrations/`, run via `migrate.py`), and the worklog seed script (`seed.py`)
- `docker-compose.yml` — runs frontend, backend, and Postgres together locally
- `docs/worklog/WORKLOG.md` — append-only log of coding-agent sessions
- `docs/decisions/DECISIONS.md` — append-only architecture decision log

## Architecture rules
- AI providers are called only through one backend wrapper (`backend/app/ai/client.py` —
  currently a stubbed interface; no real provider call wired up yet).
- Application data access goes through `backend/app/telemetry/repository.py` (and future
  sibling repository modules) — not raw queries scattered through route handlers — and
  through `backend/app/db/connection.py` as the single DB connection seam.
- The frontend talks to the backend only via `frontend/src/lib/api.ts` against the
  documented HTTP/JSON endpoints (`/api/health`, `/api/telemetry/summary`) — no backend
  internals or DB access from frontend code.
- Meaningful actions must emit an event through the telemetry layer per
  [TELEMETRY_RULES.md](.ai/TELEMETRY_RULES.md) (the `events` table, seeded today from
  `docs/worklog/ai_sessions.jsonl` via `backend/seed.py`; live app-side emission lands with
  the first real feature that needs it).
- Do not add services or infrastructure unless the task explicitly requires it.
- Prefer Postgres JSONB metadata over standing up new infrastructure.

## Permissions (.claude/settings.json)
This repo uses [.claude/settings.json](.claude/settings.json) to reduce approval fatigue during
agent sessions:
- Safe local file edits (read/edit/write) and the local git workflow (`status`, `diff`, `add`,
  `commit`, `log`, `branch`) are auto-approved, since they're reversible and reviewable in the diff.
- Destructive, cloud, network, and credential-related actions (e.g. `rm -rf`, `curl`/`wget`,
  `aws`/`gcloud`/`az`, `terraform apply`/`destroy`, anything touching `~/.ssh`) remain blocked or
  require explicit confirmation every time — no setting in this repo grants them automatically.

## Coding style
- Keep diffs small and reviewable.
- No comments that restate what the code does — only ones that explain non-obvious "why."
- Match existing formatting and naming conventions in the file you're editing.

## Scope restrictions (no-go list for MVP)
- No auth system.
- No Kubernetes.
- No Redis.
- No vector database.
- No realtime infrastructure.
- No new cloud resources.
- No payments or multi-user SaaS behavior.
- No app code (frontend, backend, infra/Terraform, database migrations) until explicitly requested —
  the project is currently at the control-layer stage.

## Controlled vocabularies
Use these exact values everywhere telemetry or task metadata is recorded. Do not invent new ones —
propose additions via [docs/decisions/DECISIONS.md](docs/decisions/DECISIONS.md) first.

`feature_area`: frontend | backend | infra | ai | observability | docs | todo_agent | mobile

`session_type`: coding | debugging | architecture | writing | review | planning | other

`source`: app | manual | github | scheduled_job | mobile | git_hook

`model_provider`: anthropic | openai | local | other

Full event schema and required fields live in [.ai/TELEMETRY_RULES.md](.ai/TELEMETRY_RULES.md).

## Required categorization fields
Every task and every coding-agent session — Claude Code, Codex, or otherwise — must be categorized
using these fields, with the controlled-vocabulary values above where one applies:
- `session_type`
- `feature_area`
- `model_provider`
- `model_name`
- `task_id` when available (otherwise note "none")

These names match the `events` table fields in [.ai/TELEMETRY_RULES.md](.ai/TELEMETRY_RULES.md) —
use them exactly so worklog entries, task templates, and future event data line up.

## Commit rules

Commit format:
```
<type>: <description>
```

Allowed types:
- `feat`
- `fix`
- `refactor`
- `docs`
- `infra`
- `telemetry`
- `agent`

Rules:
- lowercase type
- imperative mood
- max 72 characters
- one logical change per commit
- no "update", "misc", "wip", "final", "changes", or "more work"

Good examples:
- `agent: harden project operating rules`
- `docs: define telemetry vocabulary`
- `telemetry: add coding session schema`
- `infra: add local postgres service`
- `feat: implement todo creation endpoint`

## End-of-task checklist
- Changed files: list what was created, edited, or deleted.
- Tests run: what ran, with results — or an explanation of why none were run.
- Telemetry impact: new/changed event types, fields, or feature areas touched.
- Cost/token risk: estimate per [.ai/TOKEN_BUDGET.md](.ai/TOKEN_BUDGET.md), and flag anything unusual.
- Docs updated: confirm whether [docs/worklog/WORKLOG.md](docs/worklog/WORKLOG.md) and
  [docs/decisions/DECISIONS.md](docs/decisions/DECISIONS.md) were updated (or why not).
- Proposed commit message: one line following the commit rules above, ready for the user to approve.
