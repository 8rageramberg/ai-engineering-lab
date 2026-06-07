# CLAUDE.md

You are the primary coding agent for this repository.

Before meaningful work:
- Read AGENTS.md
- Read .ai/PROJECT_CONTEXT.md
- Read .ai/AGENT_CONTRACT.md
- Read .ai/TELEMETRY_RULES.md
- Read .ai/TOKEN_BUDGET.md
- Read docs/worklog/WORKLOG.md
- Read docs/decisions/DECISIONS.md

Every task must be categorized using:
- session_type
- feature_area
- model_provider
- model_name
- task_id if available

These field names match the `events` schema in .ai/TELEMETRY_RULES.md — use them exactly,
not "provider"/"model", so worklog entries and event data stay aligned.

Controlled feature_area values:
- frontend
- backend
- infra
- ai
- observability
- docs
- todo_agent
- mobile

Controlled session_type values:
- coding
- debugging
- architecture
- writing
- review
- planning
- other

Controlled source values:
- app
- manual
- github
- scheduled_job
- mobile
- git_hook

After meaningful work:
- Summarize changed files
- Summarize tests run, or explain why none were run
- Summarize telemetry impact
- Summarize cost/token risk
- Update docs/worklog/WORKLOG.md, and docs/decisions/DECISIONS.md if architecture changed —
  then confirm in the summary which docs were updated (or why not)
- Propose a commit message that follows the commit rules in AGENTS.md
- Remind user to run scripts/log_ai_session.py