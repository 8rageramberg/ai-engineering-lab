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

### 2026-06-08 — Retone the frontend to a warm earth-tone palette for readability
- agent: claude-code
- session_type: coding
- feature_area: frontend
- task_id: none
- summary: Styling-only pass replacing the low-contrast dark-bg/white-card scheme with a
  warm earth-tone palette (sage green, cream/beige, tan, deep maroon, dark olive), centralized
  as semantic CSS custom properties + Tailwind v4 `@theme inline` tokens (`background`,
  `surface`, `text-primary`, `text-secondary`, `accent-primary`, `accent-secondary`,
  `accent-alert`) in `globals.css` so the palette can be swapped from one place. Retoned
  `layout.tsx`, `page.tsx`, and `dashboard/page.tsx` to use the new tokens — no layout, data,
  or functionality changes.
- changed_files: frontend/src/app/globals.css, frontend/src/app/layout.tsx,
  frontend/src/app/page.tsx, frontend/src/app/dashboard/page.tsx
- tests: Verified WCAG AA contrast (4.5:1 normal text, 3:1 large text) programmatically via a
  luminance/contrast script before settling on the final hex values, then rendered the pages
  and confirmed visually.
- tokens/cost: see ai_sessions.jsonl
- telemetry notes: none — no schema or vocabulary changes.

### 2026-06-08 — Stand up the local-first MVP skeleton: frontend, backend, DB, and a live telemetry dashboard
- agent: claude-code
- session_type: coding
- feature_area: infra
- task_id: none
- summary: Built the first running, visible skeleton of the portfolio app. Scaffolded
  `frontend/` (Next.js 16 + Tailwind, App Router) with an intentional landing page and a
  `/dashboard` page, and `backend/` (FastAPI) with `/api/health` and
  `/api/telemetry/summary`, talking to Postgres only through a small data-access seam
  (`app/db/connection.py`, `app/telemetry/repository.py`) plus a stubbed AI wrapper
  (`app/ai/client.py`). Wrote `docker-compose.yml` running all three together with config
  in env vars. Added a hand-rolled SQL migration for the `events` table
  (`backend/migrations/0001_create_events.sql`, applied via `backend/migrate.py`) and a
  seed script (`backend/seed.py`) that loads the real `coding_session_logged` history from
  `docs/worklog/ai_sessions.jsonl` into `events`. The dashboard now renders real,
  non-zero numbers aggregated live from that seeded data — the centerpiece visual for the
  whole portfolio. Ran `docker compose up`, applied the migration, seeded the data, and
  walked the full path end to end (landing page → backend health → dashboard → real
  numbers) before calling it done. Recorded the architecture choices (migration tool,
  server/browser API URL split discovered while wiring docker networking) in DECISIONS.md
  and brought `.ai/PROJECT_CONTEXT.md` and `AGENTS.md` up to date with what now exists.
- changed_files: frontend/ (new — Next.js scaffold + src/app/{layout,page,dashboard/page}.tsx,
  src/lib/api.ts, Dockerfile), backend/ (new — app/main.py, app/config.py,
  app/db/connection.py, app/telemetry/repository.py, app/ai/client.py, migrations/,
  migrate.py, seed.py, requirements.txt, Dockerfile), docker-compose.yml, .gitignore,
  AGENTS.md, .ai/PROJECT_CONTEXT.md, docs/decisions/DECISIONS.md, docs/worklog/WORKLOG.md
- tests: no automated test suite yet (none existed to run); verified manually end to end —
  `docker compose up -d --build` brought up postgres/backend/frontend, `migrate.py`
  applied the schema, `seed.py` loaded 4 real events, `curl`-equivalent checks against
  `/api/health` and `/api/telemetry/summary` returned correct live-aggregated figures
  (1,001,448 tokens / $14.21 / 4 sessions / 3 commits), and both the landing page
  ("backend online" indicator) and dashboard page (all four stat cards populated with
  those exact numbers) rendered correctly server-side inside the running containers
- tokens/cost: not logged here — the post-commit hook will record this commit's actuals
  automatically once it lands
- telemetry notes: no vocabulary or schema changes; `events` table now exists and is
  seeded with the first 4 real `coding_session_logged` rows, giving the dashboard
  non-placeholder data from day one

### 2026-06-08 — Add ship-it skill to streamline the commit ritual
- agent: claude-code
- session_type: writing
- feature_area: infra
- task_id: none
- summary: Added a `ship-it` project skill (`.claude/skills/ship-it/SKILL.md`) that runs the
  end-to-end "ready to commit" ritual on natural trigger phrases ("ship this", "commit now", "let's
  ship it", etc.): review the diff, draft a commit message per AGENTS.md conventions, judge whether
  the change warrants a DECISIONS.md entry, write a short narrative WORKLOG.md entry, then commit
  and push. It explicitly retires the manual telemetry-logging half of CLAUDE.md's old "after
  meaningful work" checklist — no more hand-categorizing session_type/feature_area/model_provider
  or running `scripts/log_ai_session.py` — because the post-commit git hook now derives all of that
  automatically the instant a commit lands; duplicating it by hand would only risk inconsistent data.
- changed_files: .claude/skills/ship-it/SKILL.md
- tests: none — instructions only, no executable code; exercised live for the first time on the
  commit this entry is part of
- tokens/cost: not logged here — the post-commit hook records this commit automatically
- telemetry notes: none — no vocabulary, schema, or event-type changes

### 2026-06-07 — Fix cache-token accounting bug in commit-driven telemetry
- agent: claude-code
- session_type: debugging
- feature_area: infra
- task_id: none
- summary: Fixed a token/cost accounting bug in the post-commit hook's transcript enrichment
  (`scripts/git-hooks/post-commit`): it was summing `cache_read_input_tokens` into the same
  `input_tokens` bucket as fresh input and pricing the blend at the standard input rate, inflating
  both the token count and `estimated_cost_usd` by roughly 5x (cache reads are ~10x cheaper than
  fresh input). The fix sums all four usage categories — input, output, cache write
  (`cache_creation_input_tokens`), cache read (`cache_read_input_tokens`) — independently and prices
  each at its own per-million rate (input $3, output $15, cache write $3.75, cache read $0.30,
  Claude Sonnet list pricing as of 2026-06-07, noted as subject to drift). `total_tokens` now
  reports input + output + cache-write as a "work effort" proxy; cache-read hits are reported in a
  new `cache_read_tokens` field (documented in `.ai/TELEMETRY_RULES.md`) so near-free re-reads don't
  dwarf the figure. Also corrected the one historical row affected (commit `df790d4`, logged before
  the fix) in place — recomputed against its original enrichment window and annotated with
  `metadata.corrected_at` / `metadata.correction_reason` — without touching any of its other fields.
- changed_files: scripts/git-hooks/post-commit, .ai/TELEMETRY_RULES.md, docs/worklog/ai_sessions.jsonl
  (in-place correction of the `df790d4` row only), docs/worklog/WORKLOG.md
- tests: dry-ran the corrected enrichment function against the real local transcript directory
  (input_tokens 258, cache_read_tokens ~10.9M, estimated_cost_usd ~$6.74 — consistent with the
  official usage panel's verified figures of ~264 input tokens and ~$6.88); ran the hook end-to-end
  in a throwaway temp git repo to confirm the new field appears and graceful null-degradation still
  works when no transcript directory matches; made a trivial real commit and inspected the new row
- tokens/cost: not separately logged for this debugging session — see the corrected `df790d4` row
  and the new auto-logged row from this session's commit for the actual figures
- telemetry notes: added `cache_read_tokens` to the `coding_session_logged` shape (documented in
  TELEMETRY_RULES.md alongside `message_count`); redefined `total_tokens` to exclude cache-read
  hits and `estimated_cost_usd` to price all four usage categories independently — both now closely
  match the official Claude Code usage panel instead of overstating cost ~5x

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
