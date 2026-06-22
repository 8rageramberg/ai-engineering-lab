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
                    # Skip cache_read_tokens: they represent previously-cached prompts from earlier
                    # sessions, not work done in this session. Including them inflates our token
                    # counts by 5-10x and misattributes cache value to the wrong session.

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


CORE_EVENT_FIELDS = {
    "id", "created_at", "event_type", "source", "feature_area", "task_id", "commit_sha",
    "model_provider", "model_name", "input_tokens", "output_tokens", "total_tokens",
    "estimated_cost_usd", "latency_ms", "success",
}


def to_event_row(record):
    """Convert worklog record to database row format (same as post-commit hook)."""
    extra = {k: v for k, v in record.items() if k not in CORE_EVENT_FIELDS}
    metadata = {**extra.pop("metadata", {}), **extra}
    row = {field: record.get(field) for field in CORE_EVENT_FIELDS}
    if row.get("success") is None:
        row["success"] = True
    row["metadata"] = metadata
    return row


INSERT_EVENT_SQL = r"""
\getenv event_row_json EVENT_ROW_JSON
INSERT INTO events (
    id, created_at, event_type, source, feature_area, task_id, commit_sha,
    model_provider, model_name, input_tokens, output_tokens, total_tokens,
    estimated_cost_usd, latency_ms, success, metadata
)
SELECT
    (r->>'id')::uuid,
    (r->>'created_at')::timestamptz,
    r->>'event_type',
    r->>'source',
    r->>'feature_area',
    NULLIF(r->>'task_id', '')::uuid,
    r->>'commit_sha',
    r->>'model_provider',
    r->>'model_name',
    COALESCE((r->>'input_tokens')::int, 0),
    COALESCE((r->>'output_tokens')::int, 0),
    COALESCE((r->>'total_tokens')::int, 0),
    COALESCE((r->>'estimated_cost_usd')::numeric, 0),
    NULLIF(r->>'latency_ms', '')::int,
    COALESCE((r->>'success')::boolean, true),
    COALESCE(r->'metadata', '{}'::jsonb)
FROM (SELECT :'event_row_json'::jsonb AS r) t
ON CONFLICT (id) DO NOTHING;
"""


def insert_event_row(record):
    """Best-effort dual-write to the live events table (same as post-commit hook).

    Any failure here is purely a stderr warning, never a reason to fail the skill.
    The jsonl write is the durable system of record regardless.
    """
    payload = json.dumps(to_event_row(record))
    try:
        result = subprocess.run(
            [
                "docker", "compose", "exec", "-T", "-e", f"EVENT_ROW_JSON={payload}",
                "postgres", "psql", "-U", "portfolio", "-d", "portfolio", "-v", "ON_ERROR_STOP=1",
            ],
            input=INSERT_EVENT_SQL,
            capture_output=True,
            text=True,
            cwd=REPO_ROOT,
            timeout=15,
        )
    except Exception as exc:
        print(f"end-session: could not reach the live events table, dashboard won't see this session yet ({exc})", file=sys.stderr)
        return
    if result.returncode != 0:
        detail = result.stderr.strip().splitlines()[-1] if result.stderr.strip() else "unknown error"
        print(f"end-session: live events table insert failed, dashboard won't see this session yet ({detail})", file=sys.stderr)

def main():
    prompt_count, message_count, window_started_at = read_counter()

    if prompt_count == 0 and message_count == 0:
        print("No prompts or messages in the current session. Nothing to log.")
        sys.exit(0)

    session_type = prompt_session_type()

    # Always derive window_started_at fresh from transcripts, ignoring the counter's potentially
    # stale value. Use 30 minutes as the fallback search window to avoid retroactively capturing
    # stale cached context from hours earlier.
    from datetime import timedelta
    fallback_window = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
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
        insert_event_row(record)
        print(f"\n✓ Session logged: {session_type} ({prompt_count} prompts, {message_count} messages)")
        print(f"  Tokens: {total_tokens} | Cost: ${estimated_cost_usd:.2f}")
        print(f"  Duration: {(parse_iso(record['created_at']) - parse_iso(actual_window_started_at)).total_seconds() / 3600:.1f} hours")
    except Exception as e:
        print(f"Error logging session: {e}")
    finally:
        # ALWAYS reset the counter, even if something failed. This prevents duplicate logging
        # when the next commit hook or skill runs — the counter must be zero after a skill fires.
        reset_counter()

if __name__ == "__main__":
    main()
