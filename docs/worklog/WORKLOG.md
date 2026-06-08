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

### 2026-06-08 — Fix dashboard headline metrics and a residual live-sync gap
- agent: claude-code
- session_type: debugging
- feature_area: observability
- task_id: none
- summary: The newly-shipped "hours of AI-assisted development" headline was showing 1.0
  hours when the real figure was closer to 4 — `window_started_at` (the field it summed)
  only exists on rows logged after it was added that same morning, so all four day-one
  sessions silently contributed zero. While investigating, also found the live `events`
  table itself was missing 3 real commits' worth of rows (`f374e31`, `e28c9db`, `dea2a6b`)
  — they landed in the gap between the initial seed and the dual-write hook going live, and
  were never backfilled, undercounting every aggregate stat by those rows. Fixed both:
  re-ran `seed.py` (its `ON CONFLICT (id) DO NOTHING` made this safe — it only inserted the
  3 missing rows) to bring the live table to parity with the jsonl (15/14/53/$28.16); and
  replaced the broken hours calculation with an explicit, labeled approximation —
  `tracked_dev_hours` (precisely measured, same SUM as before, grows more accurate over
  time) plus a fixed, hand-supplied `PRE_TRACKING_HOURS_ESTIMATE = 3.0` constant for the
  unmeasurable day-one work, with the full breakdown spelled out in the dashboard caption.
  Also replaced the never-displayed, since-removed hours figure's sibling problem — the
  "coding sessions logged" vs "commits shipped" mismatch looking like a bug — with a hint
  explaining that purely-exploratory sessions can outnumber commits; and surfaced the
  prompt-counting system (`prompt_count`, logged on every row but never shown) as its own
  fully-accurate "prompts sent to build this" headline (53, summed with zero estimation).
- changed_files: backend/app/telemetry/repository.py, frontend/src/lib/api.ts,
  frontend/src/app/dashboard/page.tsx, docs/decisions/DECISIONS.md
- tests: rebuilt backend+frontend, queried `get_summary()` directly in the running
  container before and after the reseed (12/11/$24.39 → 15/14/$28.16, confirming the 3
  missing rows landed and nothing duplicated), and fetched the rendered dashboard HTML to
  confirm the new headline values (53 prompts, ≈4.0h with the 1.0h/3.0h breakdown in the
  caption) and stat hints render as written.
- tokens/cost: see ai_sessions.jsonl
- telemetry notes: none — no vocabulary or schema changes; `PRE_TRACKING_HOURS_ESTIMATE` is
  a documented, hardcoded constant in `repository.py`, not an event field.

### 2026-06-08 — Fix live telemetry sync and add hours/calendar metrics to the dashboard
- agent: claude-code
- session_type: coding
- feature_area: observability
- task_id: none
- summary: Closed the gap where the dashboard only reflected `events` rows loaded by the
  one-time seed script — the `post-commit` hook now dual-writes every
  `coding_session_logged` row straight into the live `events` table (via
  `docker compose exec ... psql`, working around a native-Postgres port collision on
  :5432) immediately after appending it to the jsonl worklog, so new commits show up with
  no manual reseed. Also: persisted a new `window_started_at` field on each row (session
  start, alongside the existing commit-time `created_at`) so session duration can be
  computed; relabeled the "estimated cost" stat to be honest about it being list-rate
  pricing, not an invoice; pulled a new headline metric — "hours of AI-assisted
  development" — out of the supporting-stats grid, computed by summing
  `created_at - window_started_at` across every logged session
  (`backend/app/telemetry/repository.py`); and added a token-weighted GitHub-style
  activity calendar (`ActivityCalendar.tsx` + `GET /api/telemetry/daily-activity`) shaded
  by tokens spent per day rather than commit count, using only existing palette tokens at
  rising opacity.
- changed_files: scripts/git-hooks/post-commit, backend/app/telemetry/repository.py,
  backend/app/main.py, frontend/src/lib/api.ts, frontend/src/app/dashboard/page.tsx,
  frontend/src/app/dashboard/ActivityCalendar.tsx, docs/decisions/DECISIONS.md
- tests: rebuilt the stack, made a trivial verification commit, and confirmed its row
  appeared live on the dashboard (tokens/cost/sessions/hours/calendar all updated) with no
  reseed — the exact gap this fixes. Confirmed the dual-write degrades gracefully (stderr
  warning, commit still succeeds) when the live-table insert can't reach postgres.
  Screenshots confirmed the new headline, relabeled stat, and calendar render correctly.
- tokens/cost: see ai_sessions.jsonl
- telemetry notes: `coding_session_logged` rows gain an optional `window_started_at`
  field (documented in DECISIONS.md); no controlled-vocabulary changes. The live-table
  dual-write means `events` now stays in sync with the jsonl worklog automatically —
  the seed script remains useful only for fresh/empty databases.

### 2026-06-08 — Add a polled live system-status view to the dashboard
- agent: claude-code
- session_type: coding
- feature_area: observability
- task_id: none
- summary: Added a second observability "tile" — service health, uptime, and per-container
  CPU/memory — refreshed by polling `GET /api/system-status` every 5 seconds. New backend
  package `backend/app/system_status/` aggregates frontend/backend/database health checks
  and per-container stats (via the `docker` Python SDK over a read-only-mounted Docker
  socket, looked up by `com.docker.compose.service` label); new client component
  `SystemStatus.tsx` polls and renders it using the existing palette tokens. Deliberately
  boring: no websockets, no Prometheus/Grafana — just a `setInterval` fetch, per the MVP
  boundary against realtime infrastructure.
- changed_files: backend/app/system_status/{__init__,docker_stats,service}.py,
  backend/app/config.py, backend/app/main.py, backend/requirements.txt, docker-compose.yml,
  frontend/src/app/dashboard/SystemStatus.tsx, frontend/src/app/dashboard/page.tsx,
  frontend/src/lib/api.ts
- tests: Ran the full stack, loaded the dashboard, and watched the section update with real
  live numbers. Then actually stopped the backend (`docker compose stop backend`) and
  confirmed the section fell back to its "unreachable" state within one poll cycle, then
  restarted it and confirmed recovery to all-healthy within ~10 seconds — verified via
  Playwright screenshots at each stage, not assumed.
- tokens/cost: see ai_sessions.jsonl
- telemetry notes: none — this is read-only operational data surfaced through its own
  endpoint, not a `coding_session_logged`/`events` row; no schema or vocabulary changes.

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
