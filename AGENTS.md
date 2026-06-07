# AGENTS.md

Generic onboarding for any coding agent working in this repository (Claude Code, Codex, Copilot, or other).

## Project goal
Build a cloud-based AI engineering portfolio platform with clean telemetry, low cost, and a polished MVP.
See [.ai/PROJECT_CONTEXT.md](.ai/PROJECT_CONTEXT.md) for the full product summary.

## Setup commands
This repo is currently in the control-layer / planning stage — no app code exists yet.
Setup commands will be added here once `frontend/`, `backend/`, and `docker-compose.yml` exist
(see the target layout in [.ai/PROJECT_CONTEXT.md](.ai/PROJECT_CONTEXT.md)).

## Repo map (current)
- `AGENTS.md` — this file, generic agent onboarding
- `CLAUDE.md` — Claude Code session memory and rules
- `.ai/` — stricter internal contracts every agent must read before meaningful work
- `docs/worklog/WORKLOG.md` — append-only log of coding-agent sessions
- `docs/decisions/DECISIONS.md` — append-only architecture decision log

## Architecture rules
- AI providers are called only through one backend wrapper (`backend/app/ai/client.py`, once it exists).
- Meaningful actions must emit an event through the telemetry layer (`backend/app/telemetry/events.py`, once it exists).
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

`source`: app | manual | github | scheduled_job | mobile

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
