---
name: end-session
description: Close out a planning/architecture/debugging session and log it to telemetry, without requiring a commit. Use when you've finished a meaningful session (planning, architecture review, debugging investigation, etc.) and want it recorded in the project's telemetry even though no code was committed. Phrases like "end session", "log this session", "close session", "done for today", "wrap up" should trigger this.
---

# End Session

When you've finished a meaningful **non-coding session** (planning, architecture discussion, debugging investigation, code review, etc.) and want it logged to the project's telemetry without requiring a commit, use this skill.

## What it does

1. Reads the accumulated `prompt_count` and `message_count` from `.ai/session_counter.json`
2. Derives the true session start time from the project's Claude Code transcripts (same logic as the post-commit hook)
3. Asks you for the `session_type` (planning, debugging, architecture, writing, review, other) — this is the only manual input required
4. Writes one structured `coding_session_logged` row to `docs/worklog/ai_sessions.jsonl` with `source: session_end` and your specified `session_type`
5. Resets the counter to zero, ready for tomorrow's work

## Why it exists

The post-commit hook only logs work that lands as commits. Planning, architecture discussions, debugging investigations, and code reviews are real work that consume tokens but often produce no code commits. This skill makes that work visible in your telemetry so the dashboard shows the full picture of your development activity — coding sessions AND thinking sessions.

## How to use it

At the end of a planning or architecture session, just say one of:
- "end session"
- "log this session"
- "done for today"
- "wrap up"
- "close session"

The skill will ask: **"What type of session was this?"** and offer the controlled options:
- `planning` — scoping, design, architecture, strategy
- `debugging` — investigation, root-cause analysis
- `architecture` — system design, refactoring decisions
- `writing` — docs, comments, technical writing
- `review` — code review, decision review
- `other` — something else

Pick one, and the session is logged. That's it.

## What gets logged

A row in `docs/worklog/ai_sessions.jsonl` with:
- `event_type: "coding_session_logged"`
- `source: "session_end"` (distinguishes from `git_hook` commits and `manual` entries from `log_ai_session.py`)
- `model_provider: "anthropic"` (or the dominant model if mixed)
- `session_type: <your choice>` (planning, debugging, etc.)
- `feature_area: null` (planning sessions aren't tied to a specific feature)
- `prompt_count` and `message_count` (from the accumulated counter)
- `window_started_at` and `created_at` (derived from transcripts and current time, same as the hook)
- `input_tokens`, `output_tokens`, `total_tokens`, `cache_read_tokens`, `estimated_cost_usd` (from transcript enrichment)
- `summary: null` (no commit message for a planning session — the `session_type` is the label)

The row shows up on your dashboard immediately, contributing to the total "hours of AI-assisted development" and giving you visibility into the mix of coding vs. planning/thinking work.

## Telemetry impact

This introduces a new `source` value: `session_end`. Update `TELEMETRY_RULES.md`, `AGENTS.md`, and `CLAUDE.md` to include it in the controlled vocabulary for `source`.

This also makes `session_type` appear on non-commit rows (planning/debugging/architecture sessions), whereas `git_hook` rows currently have `session_type: null`. Future work: consider backfilling `session_type` on historical `git_hook` rows via heuristics (analyze commit messages and changed files to infer whether it was a refactor, feature, docs, etc.).
