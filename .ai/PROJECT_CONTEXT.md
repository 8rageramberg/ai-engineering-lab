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

## Stack (target — not yet built)
- Frontend: Next.js + Tailwind
- Backend: FastAPI
- Database: Postgres (JSONB for flexible metadata; no separate vector DB)
- Local-first: docker compose
- Infra: Terraform (only once the app exists; no cloud resources during control-layer/MVP setup)

## Current stage
Control-layer / planning stage. `AGENTS.md`, `CLAUDE.md`, `.ai/`, and `docs/` exist to define how
agents work and log activity. No frontend, backend, Terraform, or migration code exists yet.

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
