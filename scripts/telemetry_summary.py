#!/usr/bin/env python3
"""Sum total_tokens and estimated_cost_usd across docs/worklog/ai_sessions.jsonl.

This is the "cumulative tokens/cost invested in this project" figure for the portfolio.
Standard library only. Run from the repo root:
    python3 scripts/telemetry_summary.py
"""

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
WORKLOG_PATH = REPO_ROOT / "docs" / "worklog" / "ai_sessions.jsonl"


def main():
    rows = 0
    total_tokens = 0
    estimated_cost_usd = 0.0

    with WORKLOG_PATH.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            rows += 1
            total_tokens += record.get("total_tokens") or 0
            estimated_cost_usd += record.get("estimated_cost_usd") or 0

    print(f"sessions logged:     {rows}")
    print(f"total_tokens:        {total_tokens}")
    print(f"estimated_cost_usd:  {estimated_cost_usd:.6f}")


if __name__ == "__main__":
    main()
