#!/usr/bin/env python3
"""End a planning/architecture/debugging session and log it to telemetry.

Reads the accumulated prompt/message counts from .ai/session_counter.json,
derives the true session start from transcripts, asks for session_type,
writes a coding_session_logged row to ai_sessions.jsonl with source: "session_end",
and resets the counter.

Usage: python3 end_session.py
"""

import json
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
COUNTER_PATH = REPO_ROOT / ".ai" / "session_counter.json"
WORKLOG_PATH = REPO_ROOT / "docs" / "worklog" / "ai_sessions.jsonl"
TRANSCRIPT_DIR = Path.home() / ".claude" / "projects" / str(REPO_ROOT.resolve()).replace("/", "-")

SESSION_TYPES = ["planning", "debugging", "architecture", "writing", "review", "other"]

def parse_iso(timestamp):
    return datetime.fromisoformat(timestamp.replace("Z", "+00:00"))

def read_counter():
    try:
        data = json.loads(COUNTER_PATH.read_text(encoding="utf-8"))
        return data.get("prompt_count", 0), data.get("message_count", 0), data.get("window_started_at")
    except Exception as e:
        print(f"Error reading counter: {e}")
        sys.exit(1)

def find_earliest_transcript_timestamp(window_started_at):
    """Find the earliest timestamp in transcripts since window_started_at."""
    if not window_started_at or not TRANSCRIPT_DIR.is_dir():
        return None

    try:
        window_start = parse_iso(window_started_at)
    except ValueError:
        return None

    window_end = datetime.now(timezone.utc)
    earliest = None

    for jsonl_path in TRANSCRIPT_DIR.glob("*.jsonl"):
        try:
            with jsonl_path.open(encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    timestamp = entry.get("timestamp")
                    if not timestamp:
                        continue
                    try:
                        entry_time = parse_iso(timestamp)
                    except ValueError:
                        continue

                    if not (window_start <= entry_time <= window_end):
                        continue

                    if earliest is None or entry_time < earliest:
                        earliest = entry_time
        except Exception:
            continue

    return earliest.isoformat() if earliest else None

def prompt_session_type():
    """Ask user for session type."""
    print("\nWhat type of session was this?")
    for i, st in enumerate(SESSION_TYPES, 1):
        print(f"  {i}. {st}")

    while True:
        try:
            choice = input("\nEnter number (1-6): ").strip()
            idx = int(choice) - 1
            if 0 <= idx < len(SESSION_TYPES):
                return SESSION_TYPES[idx]
        except ValueError:
            pass
        print("Invalid choice. Enter a number between 1 and 6.")

def enrich_from_transcripts(window_started_at):
    """Derive token/model info from transcripts (same logic as post-commit hook)."""
    if not window_started_at or not TRANSCRIPT_DIR.is_dir():
        return None, None, None, None, None, None

    try:
        window_start = parse_iso(window_started_at)
    except ValueError:
        return None, None, None, None, None, None

    window_end = datetime.now(timezone.utc)
    seen_message_ids = set()
    input_tokens = 0
    output_tokens = 0
    cache_creation_tokens = 0
    cache_read_tokens = 0
    model_counts = {}

    for jsonl_path in TRANSCRIPT_DIR.glob("*.jsonl"):
        try:
            with jsonl_path.open(encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    timestamp = entry.get("timestamp")
                    if not timestamp:
                        continue
                    try:
                        entry_time = parse_iso(timestamp)
                    except ValueError:
                        continue

                    if not (window_start <= entry_time <= window_end):
                        continue

                    message = entry.get("message")
                    if not isinstance(message, dict):
                        continue
                    usage = message.get("usage")
                    if not isinstance(usage, dict):
                        continue

                    message_id = message.get("id")
                    if message_id:
                        if message_id in seen_message_ids:
                            continue
                        seen_message_ids.add(message_id)

                    input_tokens += usage.get("input_tokens", 0)
                    output_tokens += usage.get("output_tokens", 0)
                    cache_creation_tokens += usage.get("cache_creation_input_tokens", 0)
                    cache_read_tokens += usage.get("cache_read_input_tokens", 0)

                    model_name = message.get("model")
                    if model_name:
                        model_counts[model_name] = model_counts.get(model_name, 0) + 1
        except Exception:
            continue

    if not seen_message_ids:
        return None, None, None, None, None, None

    total_tokens = input_tokens + output_tokens + cache_creation_tokens
    estimated_cost_usd = round(
        (input_tokens * 3.0 + output_tokens * 15.0 + cache_creation_tokens * 3.75 + cache_read_tokens * 0.30) / 1_000_000,
        6
    )
    model_name = max(model_counts.items(), key=lambda kv: kv[1])[0] if model_counts else None

    return input_tokens, output_tokens, total_tokens, cache_read_tokens, estimated_cost_usd, model_name

def reset_counter():
    """Reset the session counter."""
    try:
        COUNTER_PATH.write_text(
            json.dumps({
                "prompt_count": 0,
                "message_count": 0,
                "window_started_at": None,
            }),
            encoding="utf-8",
        )
    except Exception as e:
        print(f"Error resetting counter: {e}")

def append_event(record):
    """Append the session row to the worklog."""
    WORKLOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with WORKLOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")

def main():
    prompt_count, message_count, window_started_at = read_counter()

    if prompt_count == 0 and message_count == 0:
        print("No prompts or messages in the current session. Nothing to log.")
        sys.exit(0)

    session_type = prompt_session_type()

    # Always derive window_started_at fresh from transcripts, ignoring the counter's potentially
    # stale value. Use 24 hours ago as the fallback search window.
    from datetime import timedelta
    fallback_window = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    actual_window_started_at = find_earliest_transcript_timestamp(fallback_window)
    if not actual_window_started_at:
        actual_window_started_at = fallback_window

    input_tokens, output_tokens, total_tokens, cache_read_tokens, estimated_cost_usd, model_name = enrich_from_transcripts(actual_window_started_at)

    record = {
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "event_type": "coding_session_logged",
        "source": "session_end",
        "model_provider": "anthropic",
        "model_name": model_name,
        "session_type": session_type,
        "feature_area": None,
        "task_id": None,
        "prompt_count": prompt_count,
        "message_count": message_count,
        "window_started_at": actual_window_started_at,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "cache_read_tokens": cache_read_tokens,
        "estimated_cost_usd": estimated_cost_usd,
        "summary": None,
        "changed_files": [],
        "metadata": {},
    }

    try:
        append_event(record)
        reset_counter()
        print(f"\n✓ Session logged: {session_type} ({prompt_count} prompts, {message_count} messages)")
        print(f"  Tokens: {total_tokens} | Cost: ${estimated_cost_usd:.2f}")
        print(f"  Duration: {(parse_iso(record['created_at']) - parse_iso(actual_window_started_at)).total_seconds() / 3600:.1f} hours")
    except Exception as e:
        print(f"Error logging session: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
