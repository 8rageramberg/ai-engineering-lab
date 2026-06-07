#!/usr/bin/env python3
"""Increment one field of .ai/session_counter.json. Counts only.

Never reads the hook's stdin payload — UserPromptSubmit and Stop hooks receive
prompt/transcript data on stdin, and the telemetry contract forbids capturing
prompt or response content (see .ai/TELEMETRY_RULES.md).

Usage: bump_session_counter.py <prompt_count|message_count>
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

COUNTER_PATH = Path(__file__).resolve().parent.parent.parent / ".ai" / "session_counter.json"


def main():
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
