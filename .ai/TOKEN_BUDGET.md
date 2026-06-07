# TOKEN_BUDGET.md

Cost control policy. Use policy, not vibes — long agent sessions burn tokens quickly, and unlogged
or unexplained spikes are exactly the kind of dirty data this project is meant to avoid.

## Model usage policy by use case
| Use case | Preferred model/tool | Budget rule |
|---|---|---|
| Major architecture/design | Claude Code | Accept higher token use, but require a summary and a decision log entry |
| Implementation of a scoped task | Claude Code | One focused session per task where possible |
| Diff review | Codex | Keep cheap and bounded |
| Bug isolation | Codex or Claude | Use the smallest context that reproduces the issue |
| Docs cleanup | Codex or a cheaper model | Avoid premium models unless the text is strategic |
| App demo agent (in-repo, public-facing) | Cheap model by default | Hard input limits and rate limits |

## Daily budget
- Set a soft daily token/cost budget once real usage data exists (no historical baseline yet —
  record the first week's actuals in the worklog, then set the soft budget from that).
- Track usage by model, category, feature area, task, and day per
  [TELEMETRY_RULES.md](TELEMETRY_RULES.md).

## Escalation triggers
- If daily AI cost crosses the soft budget: stop broad exploratory prompting and switch to scoped
  tasks only.
- If one task uses unusually high tokens: log why in
  [docs/worklog/WORKLOG.md](../docs/worklog/WORKLOG.md).
- If the agent repeatedly fails on the same task: switch model or implement manually rather than
  burning more tokens retrying.
- If a context window becomes huge: ask the agent for a compact handoff summary and start a fresh
  session.
