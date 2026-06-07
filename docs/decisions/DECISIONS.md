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
