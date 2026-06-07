#!/usr/bin/env python3
"""Interactively log a Claude Code / Codex coding-agent session as a structured event.

Appends one JSON object per line to docs/worklog/ai_sessions.jsonl. Standard library only.

Run from the repo root:
    python3 scripts/log_ai_session.py
"""

import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

# Controlled vocabularies — must stay in sync with .ai/TELEMETRY_RULES.md
PROVIDERS = ["anthropic", "openai", "local", "other"]
SESSION_TYPES = ["coding", "debugging", "architecture", "writing", "review", "planning", "other"]
FEATURE_AREAS = [
    "frontend", "backend", "infra", "ai", "observability", "docs", "todo_agent", "mobile",
]

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = REPO_ROOT / "docs" / "worklog" / "ai_sessions.jsonl"


def prompt_choice(label, choices):
    options = " | ".join(choices)
    while True:
        value = input(f"{label} ({options}): ").strip().lower()
        if value in choices:
            return value
        print(f"  Invalid value '{value}'. Must be one of: {options}")


def prompt_required(label):
    while True:
        value = input(f"{label}: ").strip()
        if value:
            return value
        print("  This field is required.")


def prompt_optional(label):
    value = input(f"{label} (optional, press Enter to skip): ").strip()
    return value or None


def prompt_optional_int(label):
    while True:
        raw = input(f"{label} (optional integer, press Enter to skip): ").strip()
        if not raw:
            return None
        try:
            return int(raw)
        except ValueError:
            print("  Must be a whole number, or blank to skip.")


def prompt_optional_float(label):
    while True:
        raw = input(f"{label} (optional number, press Enter to skip): ").strip()
        if not raw:
            return None
        try:
            return float(raw)
        except ValueError:
            print("  Must be a number, or blank to skip.")


def prompt_changed_files():
    raw = input("changed_files (optional, comma-separated paths, press Enter to skip): ").strip()
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


def build_record():
    print("Logging a coding-agent session as a structured event.")
    print("Use the controlled vocabularies — invalid entries will be reprompted.\n")

    model_provider = prompt_choice("provider", PROVIDERS)
    model_name = prompt_required("model_name")
    session_type = prompt_choice("session_type", SESSION_TYPES)
    feature_area = prompt_choice("feature_area", FEATURE_AREAS)
    task_id = prompt_optional("task_id")
    prompt_count = prompt_optional_int("prompt_count")
    input_tokens = prompt_optional_int("input_tokens")
    output_tokens = prompt_optional_int("output_tokens")
    estimated_cost_usd = prompt_optional_float("estimated_cost_usd")

    print("\nsummary: describe the session in a sentence or two.")
    print("Do not paste raw prompt text, file contents, or secrets — a short description is enough.")
    summary = prompt_required("summary")

    changed_files = prompt_changed_files()

    total_tokens = None
    if input_tokens is not None and output_tokens is not None:
        total_tokens = input_tokens + output_tokens

    return {
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "event_type": "coding_session_logged",
        "source": "manual",
        "model_provider": model_provider,
        "model_name": model_name,
        "session_type": session_type,
        "feature_area": feature_area,
        "task_id": task_id,
        "prompt_count": prompt_count,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "estimated_cost_usd": estimated_cost_usd,
        "summary": summary,
        "changed_files": changed_files,
    }


def write_record(record):
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")


def main():
    try:
        record = build_record()
    except (EOFError, KeyboardInterrupt):
        print("\nAborted — nothing was logged.")
        sys.exit(1)

    write_record(record)
    print(f"\nLogged session {record['id']} to {OUTPUT_PATH.relative_to(REPO_ROOT)}")
    print(json.dumps(record, indent=2))


if __name__ == "__main__":
    main()
