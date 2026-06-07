# AGENT_CONTRACT.md

Rules every AI-assisted coding session in this repo must follow — Claude Code, Codex, or any other
agent. Read this before doing meaningful work. If a task conflicts with this contract, stop and ask
the user rather than improvising around it.

## Allowed actions
- Read any file in the repo to build context.
- Edit, create, or delete files directly relevant to the current, explicitly-scoped task.
- Run tests and local commands needed to verify a change.
- Propose architecture or scope changes — but record them in
  [docs/decisions/DECISIONS.md](../docs/decisions/DECISIONS.md) rather than acting on them silently.
- Update [docs/worklog/WORKLOG.md](../docs/worklog/WORKLOG.md) and
  [docs/decisions/DECISIONS.md](../docs/decisions/DECISIONS.md) when relevant.

## Forbidden actions
- Calling an AI provider (Anthropic, OpenAI, etc.) from application code anywhere except the single
  backend wrapper (`backend/app/ai/client.py`, once it exists).
- Adding auth, Kubernetes, Redis, a vector DB, realtime infrastructure, payments, or new cloud
  resources without an explicit request and a recorded decision.
- Building frontend, backend, Terraform, or database migration code before it is explicitly asked for
  — this repo is currently at the control-layer stage.
- Committing secrets, API keys, tokens, or credentials in code, commits, prompts, logs, screenshots,
  or exported documentation.
- Writing a "meaningful" application action without a corresponding event per
  [TELEMETRY_RULES.md](TELEMETRY_RULES.md).
- Inventing new values for controlled vocabularies (`feature_area`, `session_type`, `source`,
  `model_provider`) instead of using the ones defined in [TELEMETRY_RULES.md](TELEMETRY_RULES.md).
- Large, sweeping diffs when a small, scoped diff would do.

## Required documentation updates
After any meaningful session, update as relevant:
- [docs/worklog/WORKLOG.md](../docs/worklog/WORKLOG.md) — what was done, categorized by
  `session_type` and `feature_area`, with token/cost notes if available.
- [docs/decisions/DECISIONS.md](../docs/decisions/DECISIONS.md) — any architecture or scope decision,
  with the reasoning and alternatives considered.
- [.ai/PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) — only if the product goal, stack, or MVP boundaries
  actually changed (rare; treat as a decision in its own right).

## End-of-session summary format
Every session should end with a short summary covering:
- Changed files
- Tests run (or why none were run)
- Telemetry impact (new/changed event types, fields, or feature areas)
- Token/cost risk for the session
- Docs updated — confirm whether worklog/decisions/project context were updated, or why not
- Proposed commit message — one line following the commit rules in [AGENTS.md](../AGENTS.md)
