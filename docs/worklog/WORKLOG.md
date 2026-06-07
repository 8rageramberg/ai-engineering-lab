# WORKLOG

Append-only log of coding-agent sessions and other meaningful work. One short entry per meaningful
session is enough — this is the human-readable cross-check against the `events` table, and the
fastest way to catch dirty or missing telemetry early.

Add new entries at the top, newest first. Use the controlled vocabularies from
[.ai/TELEMETRY_RULES.md](../../.ai/TELEMETRY_RULES.md) (`feature_area`, `session_type`,
`model_provider`) — do not invent new values here.

## Entry format

```
### YYYY-MM-DD — short title
- agent: claude-code | codex | manual | other
- session_type: coding | debugging | architecture | writing | review | planning | other
- feature_area: frontend | backend | infra | ai | observability | docs | todo_agent | mobile
- task_id: <id or "none">
- summary: one or two sentences on what was done
- changed_files: list, or "none"
- tests: what ran, or why nothing ran
- tokens/cost: estimate if available, or "not logged"
- telemetry notes: any gaps, new event types, or vocabulary additions
```

## Entries

### 2026-06-07 — Project control layer created
- agent: claude-code
- session_type: writing
- feature_area: docs
- task_id: none
- summary: Created the project control layer (AGENTS.md, CLAUDE.md, .ai/ contracts, worklog and
  decisions docs) so Claude Code and Codex consistently categorize and log future AI-assisted work.
  Removed two empty duplicate stub files (root-level DECISIONS.md and TASK_TEMPLATE.md) in favor of
  their canonical locations under docs/decisions/ and .ai/.
- changed_files: AGENTS.md, CLAUDE.md (pre-existing, left as-is), .ai/PROJECT_CONTEXT.md,
  .ai/AGENT_CONTRACT.md, .ai/TELEMETRY_RULES.md, .ai/TOKEN_BUDGET.md, .ai/TASK_TEMPLATE.md,
  docs/worklog/WORKLOG.md, docs/decisions/DECISIONS.md (deleted: DECISIONS.md, TASK_TEMPLATE.md at root)
- tests: none — documentation-only change, no app code exists yet
- tokens/cost: not logged
- telemetry notes: no events table exists yet; this entry establishes the worklog format that future
  `coding_session_logged` events should mirror
