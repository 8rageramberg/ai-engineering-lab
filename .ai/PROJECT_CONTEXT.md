# PROJECT_CONTEXT.md

Stable summary of the project. This file should change rarely — treat edits to it as architecture
decisions and log them in [docs/decisions/DECISIONS.md](../docs/decisions/DECISIONS.md).

## Product goal
An AI engineering portfolio platform that demonstrates clean telemetry, cost-aware AI usage, and a
polished MVP — built using coding agents (Claude Code primary, Codex backup) while the project itself
records structured evidence of how the work happened.

## Target users
- Hiring managers and engineers evaluating the portfolio owner's AI engineering and full-stack skills.
- The portfolio owner, as a working dashboard for their own AI-assisted development activity.

## Stack
- Frontend: Next.js + Tailwind (`frontend/`)
- Backend: FastAPI (`backend/`)
- Database: Postgres (JSONB for flexible metadata; no separate vector DB) — schema applied via
  hand-rolled SQL migrations (`backend/migrations/`, run with `backend/migrate.py`)
- Local-first: docker compose (`docker-compose.yml` — frontend, backend, Postgres)
- Infra: Terraform (only once the app needs cloud resources; none yet)

## Current stage
Local-first MVP skeleton stage. The control layer (`AGENTS.md`, `CLAUDE.md`, `.ai/`, `docs/`)
is in place, and a running local skeleton exists: a Next.js landing page and telemetry
dashboard, a FastAPI backend with a health check and a telemetry-summary endpoint, and a
Postgres `events` table seeded from `docs/worklog/ai_sessions.jsonl`. See
[DECISIONS.md](../docs/decisions/DECISIONS.md) for the choices made while building it.

## MVP boundaries (non-negotiable for now)
- No auth system — use constrained demos and server-side keys.
- No Kubernetes, no Redis, no vector DB, no realtime infrastructure.
- No cloud resources until the local-first skeleton works.
- No public user can run arbitrary expensive prompts.
- All application AI calls go through a single backend wrapper.
- Every meaningful action becomes an event (database) or a worklog entry (manual/coding-agent work).

## Two agent layers (do not merge early)
| Layer | Purpose | Lives in |
|---|---|---|
| Coding agents | Claude Code (main) and Codex (backup) edit files, plan, implement, review | VS Code, terminal, local repo |
| In-repo project agent | Small backend-controlled agent that reviews code, manages todos, summarizes work, emits events | Application backend and database |

## Related files
- Agent rules: [AGENT_CONTRACT.md](AGENT_CONTRACT.md)
- Logging contract: [TELEMETRY_RULES.md](TELEMETRY_RULES.md)
- Cost policy: [TOKEN_BUDGET.md](TOKEN_BUDGET.md)
- Task format: [TASK_TEMPLATE.md](TASK_TEMPLATE.md)
