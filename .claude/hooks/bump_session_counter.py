#!/usr/bin/env python3
"""Increment one field of .ai/session_counter.json. Counts only.

Never reads the hook's stdin payload — UserPromptSubmit and Stop hooks receive
prompt/transcript data on stdin, and the telemetry contract forbids capturing
prompt or response content (see .ai/TELEMETRY_RULES.md).

Usage: bump_session_counter.py <prompt_count|message_count>
"""

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
EXPECTED_REPO_ROOT = SCRIPT_DIR.parent.parent  # .ai/hooks/ → .ai/ → . (repo root)
COUNTER_PATH = EXPECTED_REPO_ROOT / ".ai" / "session_counter.json"


def is_correct_repo():
    """Check if the current working directory is this repo. Exit silently if not."""
    try:
        current_repo_root = Path(
            subprocess.run(
                ["git", "rev-parse", "--show-toplevel"],
                capture_output=True,
                text=True,
                check=True,
            ).stdout.strip()
        )
        return current_repo_root == EXPECTED_REPO_ROOT
    except Exception:
        # Not a git repo, or git error — don't bump the counter
        return False


def main():
    # Only bump the counter if this hook is running in the correct repo
    if not is_correct_repo():
        sys.exit(0)

    field = sys.argv[1]
    if field not in ("prompt_count", "message_count"):
        sys.exit(0)

    try:
        data = json.loads(COUNTER_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        data = {
            "prompt_count": 0,
            "message_count": 0,
            "window_started_at": datetime.now(timezone.utc).isoformat(),
        }

    data[field] = data.get(field, 0) + 1
    COUNTER_PATH.write_text(json.dumps(data), encoding="utf-8")


if __name__ == "__main__":
    main()
