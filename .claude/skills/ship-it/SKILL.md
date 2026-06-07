---
name: ship-it
description: >
  Run the end-to-end "ready to commit" ritual for this repo: review the diff, draft a commit
  message in this repo's style, decide whether the change deserves a DECISIONS.md entry, write a
  short narrative WORKLOG.md entry, then commit and push. Trigger this whenever the user signals
  they're done with a unit of work and want it shipped — phrases like "ship this", "ship this
  work", "ship it", "let's ship it", "commit this", "commit now", "commit and push", "wrap this
  up", or "I'm done, let's get this in" should all activate it. This is the single repeatable
  path to landing work here — use it instead of improvising a commit by hand.
---

# Ship it

This repo logs every commit automatically — a `post-commit` git hook
([scripts/git-hooks/post-commit](../../../scripts/git-hooks/post-commit)) appends a structured
`coding_session_logged` row to `docs/worklog/ai_sessions.jsonl` the instant a commit lands, deriving
`commit_sha`, `feature_area`, token/cost figures, etc. with zero typed input. **That means the only
thing this skill needs to do to "trigger telemetry" is perform a real `git commit`.** Don't try to
run `scripts/log_ai_session.py`, don't hand-fill `session_type`/`feature_area`/`model_provider`,
and don't reproduce the old telemetry checklist from CLAUDE.md — all of that is now handled
structurally by the hook, and duplicating it by hand only risks inconsistent data. If a commit
happens, the log entry happens. Full stop.

What's left is the genuinely manual, judgment-based part — the ritual below.

## The ritual

1. **Review the diff.** Run `git status` and `git diff` (staged + unstaged) and read through what
   actually changed. Build a clear mental model of what this unit of work did and why — you'll need
   it for the next three steps.

2. **Draft the commit message.** Follow the commit rules in [AGENTS.md](../../../AGENTS.md):
   `<type>: <description>`, lowercase type, imperative mood, max 72 characters, one logical change
   per commit, no "update"/"misc"/"wip"/"final"/"changes"/"more work". Allowed types: `feat`,
   `fix`, `refactor`, `docs`, `infra`, `telemetry`, `agent`. Run `git log --oneline -10` to check
   your draft reads consistently with recent history before settling on it.

3. **Judge whether this needs a DECISIONS.md entry.** Most commits don't. Ask: did this change the
   product direction, stack, MVP boundaries, a controlled vocabulary, or the event/data schema? If
   yes, draft an entry in [docs/decisions/DECISIONS.md](../../../docs/decisions/DECISIONS.md) using
   its `decision` / `why` / `alternatives considered` / `impact` / `feature_area` format (see recent
   entries for tone and depth) and add it at the top. If no — a routine fix, refactor, or doc tweak
   — skip this step outright. Forcing an entry for routine work is exactly the kind of noise that
   makes a decision log stop being useful.

4. **Write a short narrative WORKLOG.md entry.** Add (or, if one already exists for this exact unit
   of work, extend) an entry near the top of [docs/worklog/WORKLOG.md](../../../docs/worklog/WORKLOG.md)
   following its `### YYYY-MM-DD — title` format. This is the *human-readable story* — what was
   done and why, in a sentence or two, plus changed files and what was tested (or why nothing was).
   Keep it brief and narrative. **Do not** put token counts, cost estimates, or other telemetry
   numbers in it — that's what the automatic `ai_sessions.jsonl` row is for; duplicating it here is
   exactly the redundancy this skill exists to eliminate.

5. **Stage, commit, and push.** Stage the relevant files (be specific — avoid `git add -A` if the
   working tree has unrelated changes), commit with the message from step 2, and push to the
   tracked remote. The commit is what fires the telemetry hook — there is nothing further to do to
   make logging happen.

6. **Report back, briefly.** Tell the user: what was committed (one line — the message and the
   files), whether a DECISIONS.md entry was added (and a one-line reason either way), and confirm
   the commit succeeded — which means the post-commit hook has already appended its row to
   `ai_sessions.jsonl`. No further action is needed from them; don't ask them to run anything.

## Keep it fast

The whole point of this ritual is that "ship this" turns into a finished, logged commit without
back-and-forth. Don't ask the user to fill out forms, pick `feature_area`/`session_type` values, or
estimate token costs by hand — none of that is needed anymore, and asking for it would be exactly
the kind of friction this skill is meant to remove. If something is genuinely ambiguous (e.g. the
diff mixes two unrelated changes that should be separate commits), surface that — but otherwise,
just run the ritual and report back.
