# DECISIONS

Append-only architecture and scope decision log. Record any decision that changes the product
direction, stack, MVP boundaries, controlled vocabularies, or event schema — these are exactly the
things that, if changed silently, would make historical telemetry data inconsistent with current
data.

Add new entries at the top, newest first.

## Entry format

```
### YYYY-MM-DD — short title
- decision: what was decided
- why: the reasoning / problem it solves
- alternatives considered: what else was on the table, and why it lost
- impact: what this changes (schema, vocab, scope, stack, etc.)
- feature_area: frontend | backend | infra | ai | observability | docs | todo_agent | mobile
```

## Entries

### 2026-06-08 — Add repo-path gating to telemetry hooks for true project isolation
- decision: Modify the `UserPromptSubmit` and `Stop` hook scripts to gate on the current git
  repository's absolute path. The hooks now check `git rev-parse --show-toplevel` at runtime and
  only increment the session counter (`.ai/session_counter.json`) if the current working directory
  belongs to this specific repo. Sessions in other repos, or non-git directories, exit silently
  without counting. This ensures that telemetry for one project is never polluted by AI activity
  from sessions in other projects, even when the hooks are defined at the project level in
  `.claude/settings.json`.
- why: The initial hook design fired globally for any Claude Code session, regardless of which
  repo the session was pointing at. This violated the principle of separability: a user working on
  two different projects in two different VS Code windows would have all their telemetry
  cross-contaminated into a single project's counter. This is both a data-integrity issue
  (telemetry for Project A incorrectly includes Project B's activity) and a governance issue (you
  cannot trust the numbers if you have multiple projects). The fix is structural, not
  documentation-only — it enforces isolation in code, not as a promise.
- alternatives considered:
  - Move the hooks to user-level settings (`~/.claude/settings.json`) — rejected; it would only
    move the problem, not solve it, since user-level hooks still fire globally.
  - Document the limitation and accept cross-project telemetry — rejected; this violates the
    core principle that telemetry must be honest and durable, and makes any multi-project
    workflow unreliable.
  - Ask the user to switch to a different user account for each project — rejected; solving
    infrastructure problems with policy is not in the spirit of the "boring, maintainable"
    philosophy.
- impact: `.claude/hooks/bump_session_counter.py` now imports `subprocess` and includes an
  `is_correct_repo()` function that verifies the current working directory's git root. No
  changes to the hook configuration, to `.ai/session_counter.json` structure, or to telemetry
  event schema. Existing rows remain unchanged. All future sessions in this repo will only
  count activity from this repo; sessions in other projects will not contribute to this
  project's counter. When the user sets up a second project with its own hooks, that project's
  telemetry will be similarly isolated.
- feature_area: observability

### 2026-06-08 — Wire up the first live AI feature: a constrained demo agent at /demo-agent
- decision: Replace the stubbed `backend/app/ai/client.py` with a real, narrowly-scoped
  integration to OpenAI's gpt-4o-mini, and build the project's first live, public-facing AI
  feature on top of it: a standalone `/demo-agent` page where a visitor types a short
  question about this project's own telemetry and gets a one-line, model-generated answer.
  The agent is constrained at every layer simultaneously, per TOKEN_BUDGET.md's existing
  "App demo agent (in-repo, public-facing)" policy row (cheap model, hard input/rate limits,
  non-negotiable): the model is hardcoded to gpt-4o-mini in the wrapper (not configurable by
  callers), the question is capped at 300 characters, the answer is capped at 80 output
  tokens with a 320-character backstop, a global in-memory rate limiter allows at most 5
  calls per 60 seconds, and — most importantly — the agent never runs arbitrary queries: it
  is handed one small, fixed JSON snapshot of `events` data (project summary + last 20
  sessions) assembled by a single bounded SQL query, and is told via system prompt to answer
  only from that data and decline anything else. Every successful call emits a real
  `ai_request_completed` event with genuine token/cost/latency numbers into the same
  `events` table the dashboard reads from.
- why: This closes the loop between "this project measures AI usage" and "this project
  visibly uses AI" — until now the dashboard only displayed numbers about the *building* of
  the app, never about a feature *of* the app. A general-purpose chat box would have been
  both off-brand (this is a telemetry-and-cost-discipline portfolio, not a chatbot demo) and
  a real cost/abuse risk for a public page with no auth. Constraining the agent to only ever
  see a fixed, pre-shaped snapshot of this project's own data — rather than letting it run
  queries shaped by user input — makes "narrow by construction" a defensible, demonstrable
  claim rather than a prompt-level promise that could be argued around.
- alternatives considered:
  - Letting the model write/run SQL against `events` directly — rejected outright; this is
    exactly the "general-purpose capability disguised as a feature" AGENT_CONTRACT.md and
    TOKEN_BUDGET.md exist to prevent, and is a textbook injection surface on a public page.
  - A general chat endpoint with a "be helpful about this project" system prompt only —
    rejected; system-prompt-only constraints are not code-level constraints, and this
    project's own rules require both.
  - Per-IP rate limiting — rejected for the MVP; the global in-memory counter is sufficient
    for a single-instance, local-first app and avoids the "no Redis, no new infra" boundary
    PROJECT_CONTEXT.md and AGENT_CONTRACT.md both set.
- impact: `backend/app/ai/client.py` goes from a stubbed interface to the project's first
  real outbound AI call (the single chokepoint AGENT_CONTRACT.md mandates remains intact —
  no other module calls a provider). New `backend/app/demo_agent/` package
  (`repository.py` + `service.py`), new `POST /api/ask` route, new `OPENAI_API_KEY` env var
  (read via `app/config.py`, documented in the new `backend/.env.example`, loaded into the
  container at runtime via a docker-compose `env_file` entry pointed at the gitignored
  `backend/.env`, and excluded from the build context by a new `backend/.dockerignore` so it
  can never be baked into the image). New `frontend/src/app/demo-agent/page.tsx` and a third
  nav entry alongside "Telemetry dashboard". No event-schema or controlled-vocabulary
  changes — `ai_request_completed` with `source: app` / `feature_area: ai` was already
  specified in TELEMETRY_RULES.md, just never emitted until now.
- feature_area: ai

### 2026-06-08 — Replace the "hours of AI-assisted development" headline with an explicit estimate
- decision: The dashboard's "hours of AI-assisted development" headline (added earlier the
  same day, backed purely by `SUM(created_at - window_started_at)`) silently undercounted —
  `window_started_at` only exists on rows logged after it was added that morning, so the
  four day-one sessions (2026-06-07, by far the largest chunk of real work) contributed
  zero. Rather than removing the metric outright, split it into two explicit, labeled parts:
  a `tracked_dev_hours` figure computed precisely the same way as before (and which only
  grows more accurate and complete as more `window_started_at`-bearing rows accumulate), plus
  a fixed constant `PRE_TRACKING_HOURS_ESTIMATE = 3.0` (`backend/app/telemetry/repository.py`)
  — a one-time, hand-supplied estimate of day-one work, supplied by the person who did it.
  The displayed headline is their sum, prefixed with "≈" and captioned with the exact
  breakdown and the reason a manual estimate exists at all.
- why: The honest options were: (a) keep summing only tracked rows and silently misrepresent
  total hours as ~1 instead of ~4 (the bug just found), (b) remove the metric (the
  immediately-prior decision, made before realizing a defensible middle path existed), or
  (c) be transparent that day-one hours were never measured, name a number for them anyway
  (supplied by the person who actually did the work, not invented by the agent), and label
  the whole thing as an approximation. Option (c) keeps a meaningful, human-relatable metric
  on the dashboard without violating the "no guesswork" framing — the guesswork is disclosed,
  attributed, and bounded to a fixed offset whose share of the total shrinks on its own as
  `tracked_dev_hours` grows.
- alternatives considered:
  - Backfilling `window_started_at` onto the four day-one rows — rejected; the data was
    never captured and any value written now would be fabricated, not estimated.
  - Silently keeping the original SUM-only calculation — rejected; this is the bug itself
    (a confidently-wrong "1.0 hours" headline that undercounts real work by roughly 4x).
  - Removing the metric outright — viable and was the immediately-preceding decision, but
    a labeled approximation with disclosed methodology is more informative and more in the
    spirit of a portfolio dashboard than no metric at all, as long as the estimate is
    transparent about what it is.
- impact: `get_summary()` now returns `tracked_dev_hours` and `total_dev_hours_estimate`
  instead of the removed `total_dev_hours`; `TelemetrySummary` (`frontend/src/lib/api.ts`)
  and the dashboard headline (`frontend/src/app/dashboard/page.tsx`) updated to match and to
  render the full breakdown in the caption, not just the headline number. No
  controlled-vocabulary or `events`-schema changes — `PRE_TRACKING_HOURS_ESTIMATE` is a
  hardcoded constant, documented in code as a fixed, never-recomputed offset.
- feature_area: observability

### 2026-06-08 — Persist `window_started_at` on every `coding_session_logged` row
- decision: Add `window_started_at` (the session-start timestamp already tracked in
  `.ai/session_counter.json` and used to scope transcript enrichment) to the
  `coding_session_logged` record the post-commit hook writes, alongside `created_at`
  (commit time). It is not a core `events` column — like `prompt_count`, `summary`, and
  `changed_files` before it, it folds into `metadata` JSONB via the existing
  extra-fields-to-metadata convention in `backend/seed.py`'s `to_row()` (mirrored in the
  hook's new `to_event_row()`).
- why: The hook already computed `window_started_at` (to scope transcript reads) but
  discarded it before writing the row — so "how long was this session" was knowable in the
  moment but not recoverable afterward. Persisting it turns `created_at - window_started_at`
  into a queryable per-row duration, which is exactly what a new "hours of AI-assisted
  development" headline metric needs (`backend/app/telemetry/repository.py`'s
  `SUMMARY_QUERY` now sums it via `EXTRACT(EPOCH FROM ...)`). Skipping this would have meant
  inventing a parallel, harder-to-audit way to estimate session length.
- alternatives considered:
  - Deriving duration from `latency_ms` — rejected; that field describes a single AI
    request's response time, not a multi-prompt coding session's wall-clock span.
  - Adding `window_started_at` as a first-class `events` column — rejected as schema churn
    for a single-purpose, hook-specific timestamp; JSONB metadata is exactly the
    "flexible, schema-light" extension point `backend/seed.py` already documents and uses
    for comparable fields.
- impact: New `coding_session_logged` rows (both the jsonl and the live `events` table, see
  the dual-write entry below) carry `metadata.window_started_at`. Historical rows lack it —
  the summary query filters those out via `WHERE metadata->>'window_started_at' IS NOT NULL`,
  so the hours figure is simply quieter until enough new commits land, never wrong.
- feature_area: observability

### 2026-06-08 — Dual-write `coding_session_logged` rows to the jsonl worklog and the live `events` table
- decision: The post-commit hook (`scripts/git-hooks/post-commit`) now writes every commit's
  telemetry row to *both* `docs/worklog/ai_sessions.jsonl` (unchanged — still the durable,
  human-auditable system of record, append-only) *and* directly into the live Postgres
  `events` table, via `docker compose exec postgres psql` with the row passed as a single
  JSON value through `\getenv` (no shell-interpolation, no extra Postgres driver on the
  host). The live-table insert is strictly best-effort: any failure (compose not running,
  daemon unreachable, etc.) degrades to a stderr warning and never blocks or fails the commit
  — the jsonl write is the only one that must succeed for the row to exist at all.
- why: Previously `events` was populated once via `backend/seed.py` reading the jsonl, so
  every commit *after* that one-time seed silently never appeared on the live dashboard —
  exactly the kind of dirty/stale-data trap `.ai/TELEMETRY_RULES.md` warns about. Dual-writing
  closes that gap: the dashboard now reflects new commits immediately, with no manual reseed,
  while the jsonl remains the append-only ground truth that `seed.py` can always rebuild
  `events` from if the table is ever dropped or migrated.
- alternatives considered:
  - Have the hook write *only* to `events` and retire the jsonl — rejected; the jsonl is the
    portable, diffable, git-tracked record that survives a database wipe and is the thing a
    human can audit in a PR review. Losing it would also contradict its documented role as
    "system of record" in `.ai/TELEMETRY_RULES.md`.
  - Have the backend poll/tail the jsonl on an interval — rejected as exactly the kind of
    "premature infrastructure" `.ai/PROJECT_CONTEXT.md` warns against (a scheduler, file
    watching, drift between "logged" and "visible" times) for a problem a five-line dual
    write solves at the source.
  - Connect to Postgres directly from the host hook via `psycopg` — rejected after
    discovering this machine runs a *native* Postgres also bound to `127.0.0.1:5432`, which
    silently shadows the compose service's published port; routing through
    `docker compose exec` into the container's own network namespace sidesteps that local
    quirk entirely and avoids adding a Python dependency to the host setup.
- impact: `scripts/git-hooks/post-commit` gains `to_event_row()` (mirrors `seed.py`'s
  `to_row()` so both paths produce byte-identical row shapes) and `insert_event_row()`. No
  schema or vocabulary changes — same `coding_session_logged` shape, same `git_hook` source.
- feature_area: observability


### 2026-06-08 — Add a polled live system-status view via the Docker Engine API
- decision: Add a second observability view to the dashboard — "is this system alive right
  now, and how is it doing" — backed by a new `GET /api/system-status` endpoint
  (`backend/app/system_status/{service,docker_stats}.py`) that reports per-service health
  (frontend via an HTTP reachability probe, backend trivially up, database via `SELECT 1`),
  backend process uptime, and per-container CPU/memory/uptime. Container stats are gathered
  via the official `docker` Python SDK (`docker==7.1.0`) over a **read-only**-mounted
  `/var/run/docker.sock`, looking containers up by their stable `com.docker.compose.service`
  label. The frontend (`SystemStatus.tsx`) polls this endpoint every 5 seconds with a plain
  `setInterval` and renders a second "tile" alongside the cost/token telemetry view, using
  only the existing palette tokens (sage/olive for healthy, maroon `accent-alert` for down).
- why: A portfolio app showing what it cost to build is more convincing if it can also show
  that the thing it built is alive and well. Polling was chosen deliberately over
  websockets/SSE/Prometheus-Grafana — `.ai/PROJECT_CONTEXT.md` explicitly warns against
  premature realtime infrastructure, and a 5-second poll is indistinguishable from "live" to
  a human looking at a dashboard. The Docker SDK was chosen over shelling out to
  `docker stats` because it talks to the daemon directly over the already-available socket,
  returns structured JSON, and needs no extra CLI binary in the image.
- alternatives considered:
  - WebSockets / SSE / a streaming infra layer — rejected outright per the documented MVP
    boundary against realtime infrastructure; would be exactly the kind of premature
    investment this stage of the project is supposed to avoid.
  - Shelling out to `docker stats --no-stream` — rejected; the SDK gives the same data as
    structured JSON without invoking a subprocess or depending on the CLI being present in
    the image.
  - Frontend reaching into Docker directly — rejected outright; violates the
    replaceable-components principle. The frontend only ever sees this through the
    documented `/api/system-status` contract, same as every other piece of data it shows.
- impact: New read-only Docker socket mount on the backend service in `docker-compose.yml`
  (commented in place explaining why this is an acceptable seam for a local-first portfolio
  app), new `FRONTEND_URL` config var, new `backend/app/system_status/` package, new
  `docker==7.1.0` dependency. The endpoint degrades gracefully — `container: null` when
  Docker access is unavailable, independent per-service checks so one failing check never
  blanks the others, and the whole endpoint never errors. No controlled-vocabulary or
  `events`-schema changes; this is read-only operational data, not a telemetry event.
- feature_area: observability

### 2026-06-08 — Stand up the local-first MVP skeleton (frontend, backend, Postgres, dashboard)
- decision: Build the first running skeleton per the replaceable-components principle:
  a Next.js + Tailwind frontend (`frontend/`) that talks to FastAPI (`backend/`) only via
  documented HTTP/JSON endpoints (`frontend/src/lib/api.ts` → `/api/health`,
  `/api/telemetry/summary`); a FastAPI backend that accesses Postgres only through a
  data-access seam (`backend/app/db/connection.py` + `backend/app/telemetry/repository.py`,
  not raw queries in route handlers); a stubbed single AI wrapper
  (`backend/app/ai/client.py`, interface only, `NotImplementedError` body); and
  `docker-compose.yml` wiring all three together with config (DB URL, CORS origins, API
  base URLs) entirely in env vars. For the `events` migration, chose hand-rolled numbered
  SQL files (`backend/migrations/*.sql` + a tiny `migrate.py` runner with a
  `schema_migrations` tracking table) over Alembic.
- why: The task explicitly called for clean seams so each piece (frontend, backend, DB)
  could be swapped without rewriting the others — matching CLAUDE.md's
  "replaceable components" principle and the "modular, no overengineering" philosophy in
  PROJECT_CONTEXT.md. For migrations specifically: the schema is one table with no ORM
  models anywhere in the app, so Alembic's env.py/versioning machinery would be pure
  ceremony at this size — a "boring tool" that matches the project's actual complexity was
  preferred, with a note to revisit if/when the schema grows branches or needs downgrades.
- alternatives considered:
  - Alembic for migrations — rejected for now as overkill for a single-table schema with no
    SQLAlchemy models in the app; would add a dependency and config surface with no payoff
    yet. Revisit if the schema grows complex enough to need branching/downgrades.
  - Frontend calling Postgres directly or importing backend internals — rejected; violates
    the documented-API-contract requirement and would make the backend unswappable.
  - A single `NEXT_PUBLIC_API_BASE_URL` for both server- and client-rendered fetches —
    rejected after discovering it breaks in docker compose: server components run inside
    the frontend container and must reach the backend over the compose network
    (`http://backend:8000`), while the browser runs on the host and needs the published
    port (`http://localhost:8000`). Split into `API_BASE_URL` (server-side/internal,
    compose-only) and `NEXT_PUBLIC_API_BASE_URL` (browser-facing), selected at runtime by
    `typeof window === "undefined"` in `frontend/src/lib/api.ts`.
- impact: Establishes the on-disk layout and seams `frontend/`, `backend/app/{db,telemetry,ai}/`,
  `backend/migrations/` + `migrate.py`, and `docker-compose.yml` follow going forward. Creates
  the `events` table per `.ai/TELEMETRY_RULES.md` and a `schema_migrations` tracking table.
  Adds `backend/seed.py`, which loads `docs/worklog/ai_sessions.jsonl` into `events` —
  columns matching the core schema map directly, everything else
  (`session_type`, `prompt_count`, `message_count`, `cache_read_tokens`, `summary`,
  `changed_files`) folds into `metadata` JSONB. Updates `.ai/PROJECT_CONTEXT.md` (stage,
  stack section now reflects what exists) and `AGENTS.md` (setup commands, repo map,
  architecture rules) to match reality. No controlled-vocabulary or event-schema changes.
- feature_area: infra

### 2026-06-07 — Add `git_hook` as a distinct telemetry source
- decision: Add `git_hook` to the controlled `source` vocabulary (`.ai/TELEMETRY_RULES.md`,
  `AGENTS.md`, `CLAUDE.md`) for `coding_session_logged` events that are appended automatically by
  a local `post-commit` git hook, and add a `message_count` field alongside the existing
  `prompt_count` to the `coding_session_logged` shape.
- why: Automatic, commit-triggered telemetry is fired by a local script with no human typing and no
  GitHub round-trip — it is neither `manual` (human-typed via `scripts/log_ai_session.py`) nor
  `github` (remote/PR-based). Collapsing it into either existing value would make it impossible to
  later tell which rows were typed by a person, which came from GitHub activity, and which were
  emitted unattended by a local hook — exactly the kind of ambiguity this project's telemetry rules
  exist to prevent.
- alternatives considered:
  - Reusing `manual` — rejected because these events involve no typed input at commit time; lumping
    them together would hide how much of the worklog is unattended versus human-curated.
  - Reusing `github` — rejected because this fires from a local git hook on the developer's machine,
    not from GitHub's API or a webhook; no remote system is involved.
- impact: `source` vocabulary gains `git_hook`; `coding_session_logged` events gain an optional
  `message_count` field (counts agent turns/`Stop` events, mirrors `prompt_count`). Updates
  `.ai/TELEMETRY_RULES.md`, `AGENTS.md`, and `CLAUDE.md` together so the vocabularies stay in sync.
- feature_area: observability

### 2026-06-07 — Use project-owned telemetry as source of truth
- decision: The project will not build analytics directly on Claude Code internal logs. Coding-agent
  usage will be logged through a project-owned session logger. Application AI calls will be logged
  through the backend AI wrapper. Claude local logs may only be used as optional human cross-checks.
- why: We investigated Claude Code local logs and found that they are useful for personal debugging
  but not safe or stable enough to use as the system of record.
- alternatives considered: Building the dashboard's analytics pipeline directly on Claude Code's
  local session transcripts (`~/.claude/projects/*.jsonl`) — rejected for the reasons below.
- impact:
  - Claude logs are path-based and may fragment if the repo moves.
  - Claude logs include raw prompts, file contents, and tool I/O.
  - Claude log schema is undocumented and may change.
  - Claude logs do not include feature_area, task_id, session_type, or cost.
  - Project-owned logging gives cleaner long-term telemetry.

  Consequences: slightly more manual logging early on, but much cleaner data quality, a safer
  public dashboard, and easier long-term analytics.
- feature_area: observability

### 2026-06-07 — Establish project control layer before app code
- decision: Create AGENTS.md, CLAUDE.md, .ai/ contracts, and docs/worklog + docs/decisions before
  writing any frontend, backend, Terraform, or migration code.
- why: Per the Agent Operating System Blueprint, dirty early telemetry data is the biggest avoidable
  failure mode. Establishing shared controlled vocabularies and logging contracts up front ensures
  Claude Code and Codex categorize all future work consistently from the very first commit.
- alternatives considered: Writing app code first and retrofitting documentation/telemetry rules
  later — rejected because retrofitting consistent categorization onto inconsistent historical data
  is far harder than starting clean.
- impact: Defines the canonical locations and contents for all control-layer docs. Establishes
  `feature_area`, `session_type`, `source`, and `model_provider` as the controlled vocabularies used
  everywhere (AGENTS.md, CLAUDE.md, .ai/TELEMETRY_RULES.md, worklog, and the future events table).
- feature_area: docs

### 2026-06-07 — Remove duplicate root-level DECISIONS.md and TASK_TEMPLATE.md
- decision: Delete the empty `/DECISIONS.md` and `/TASK_TEMPLATE.md` files at the repo root.
- why: They were empty duplicates of the canonical files at `docs/decisions/DECISIONS.md` and
  `.ai/TASK_TEMPLATE.md`. Keeping both would risk agents updating the wrong copy and splitting the
  decision/task history across two locations.
- alternatives considered: Keeping both and redirecting one to the other — rejected as unnecessary
  complexity; a single canonical location per document is simpler and matches the blueprint's target
  repository layout.
- impact: One canonical location per document; no content was lost (both were empty).
- feature_area: docs
