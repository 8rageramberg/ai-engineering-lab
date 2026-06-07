# TASK_TEMPLATE.md

Repeatable format for scoping a task before starting work with a coding agent. Filling this out
up front is what lets the resulting events be categorized correctly from the start, instead of
reconstructed (and guessed at) afterward.

## Template

```
## Goal
What outcome does this task produce, in one or two sentences?

## Scope
What's explicitly in scope, and what's explicitly out of scope?

## feature_area
One of: frontend | backend | infra | ai | observability | docs | todo_agent | mobile

## session_type
One of: coding | debugging | architecture | writing | review | planning | other

## task_id
UUID/identifier if one exists in the todo system, otherwise "none yet".

## Files likely touched
List the files or directories you expect to change.

## Acceptance criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Telemetry impact
Which event types will this task emit, change, or require? Any new fields or feature areas?

## Cost/token risk
Expected size of session (small/scoped vs. large/exploratory) and which model tier applies,
per [TOKEN_BUDGET.md](TOKEN_BUDGET.md).
```

## Usage
1. Fill this out before asking a coding agent to start non-trivial work.
2. Paste the filled template into the session as the "Task" section of the session prompt
   (see CLAUDE.md for the full session prompt structure).
3. After the session, use the same `feature_area` / `session_type` / `task_id` values when logging
   the session and updating the worklog — this is what keeps task metadata and event metadata aligned.
