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
