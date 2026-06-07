# WORKLOG

Append-only log of coding-agent sessions and other meaningful work. One short entry per meaningful
session is enough — this is the human-readable cross-check against the `events` table, and the
fastest way to catch dirty or missing telemetry early.

Add new entries at the top, newest first. Use the controlled vocabularies from
[.ai/TELEMETRY_RULES.md](../../.ai/TELEMETRY_RULES.md) (`feature_area`, `session_type`,
`model_provider`) — do not invent new values here.

## Coding-session logger

After a meaningful Claude Code / Codex session, run the structured logger from the repo root:

```
python3 scripts/log_ai_session.py
```

It interactively prompts for `model_provider`, `model_name`, `session_type`, `feature_area`,
`task_id`, `prompt_count`, token counts, `estimated_cost_usd`, a short `summary`, and
`changed_files`, validates against the controlled vocabularies above, and appends one
`coding_session_logged` event per line to `docs/worklog/ai_sessions.jsonl`.

This is the structured, machine-readable record — keep it alongside, not instead of, the
narrative entries below. Never paste raw prompt text, file contents, or secrets into the
`summary` field; a short description is enough.

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

### 2026-06-07 — Commit-driven telemetry replaces manual logging as the primary path
- agent: claude-code
- session_type: coding
- feature_area: infra
- task_id: none
- summary: Implemented automatic, commit-triggered telemetry: a `post-commit` git hook
  (`scripts/git-hooks/post-commit`) now appends one `coding_session_logged` row per commit to
  `docs/worklog/ai_sessions.jsonl` with zero typed input — deriving `commit_sha`, `feature_area`
  (via a static path-prefix heuristic), `summary` (the commit message), `changed_files`, and
  best-effort token/model enrichment from local Claude Code transcripts. A small accumulator
  (`.ai/session_counter.json`, gitignored) is incremented by two new Claude Code hooks
  (`UserPromptSubmit`, `Stop`) wired in `.claude/settings.json`, which count prompts/turns without
  ever reading prompt or response content. Added `git_hook` to the controlled `source` vocabulary
  and a `message_count` field to the `coding_session_logged` shape (see DECISIONS.md), and added
  `scripts/telemetry_summary.py` to sum cumulative tokens/cost across the worklog.
  `scripts/log_ai_session.py` remains as a manual fallback for sessions that don't end in a commit.
- changed_files: .ai/TELEMETRY_RULES.md, AGENTS.md, CLAUDE.md, docs/decisions/DECISIONS.md,
  .ai/session_counter.json (gitignored), .gitignore, .claude/hooks/bump_session_counter.py,
  .claude/settings.json, scripts/git-hooks/post-commit, scripts/telemetry_summary.py,
  docs/worklog/WORKLOG.md
- tests: ran the post-commit hook end-to-end in a throwaway temp git repo (verified row shape,
  feature_area derivation, counter reset, and graceful null-degradation with no transcript match);
  separately dry-ran the token-enrichment function against the real local transcript directory to
  confirm it locates the dir, dedupes streamed usage by message id, and sums plausible totals
  without writing anything
- tokens/cost: not logged for this session (manual fallback applies — this commit will also be the
  first to produce an automatic `git_hook` row once the hook is wired via `core.hooksPath`)
- telemetry notes: added `git_hook` to the `source` vocabulary and `message_count` to the
  `coding_session_logged` shape — both recorded in DECISIONS.md and kept in sync across
  TELEMETRY_RULES.md, AGENTS.md, and CLAUDE.md

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
