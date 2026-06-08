"""Aggregates live system status for /api/system-status — health, uptime, and
best-effort container resource signals for each known service.

This is deliberately a polling-friendly snapshot, not a streaming/realtime
feed: PROJECT_CONTEXT.md rules out realtime infrastructure for the MVP, and a
plain "fetch every few seconds" loop from the frontend is enough for a human
glancing at a dashboard to feel the system is "alive".
"""

import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

from app.config import FRONTEND_URL
from app.db.connection import get_connection
from app.system_status import docker_stats

_PROCESS_STARTED_AT = time.monotonic()

# (display name, compose service label) — the compose label is what we use to
# find the right container regardless of the compose project name.
_SERVICES = (
    ("frontend", "frontend"),
    ("backend", "backend"),
    ("database", "postgres"),
)


def _check_frontend() -> tuple[str, str]:
    try:
        with urllib.request.urlopen(FRONTEND_URL, timeout=2) as response:
            ok = 200 <= response.status < 400
            return ("up" if ok else "down"), f"GET {FRONTEND_URL} returned {response.status}"
    except (urllib.error.URLError, OSError) as exc:
        return "down", f"GET {FRONTEND_URL} failed: {exc.reason if hasattr(exc, 'reason') else exc}"


def _check_backend() -> tuple[str, str]:
    return "up", "responded to this request"


def _check_database() -> tuple[str, str]:
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return "up", "SELECT 1 succeeded"
    except Exception as exc:
        return "down", f"SELECT 1 failed: {exc}"


_CHECKS = {
    "frontend": _check_frontend,
    "backend": _check_backend,
    "database": _check_database,
}


def get_status() -> dict:
    services = []
    for name, compose_service in _SERVICES:
        status, detail = _CHECKS[name]()
        services.append(
            {
                "name": name,
                "status": status,
                "detail": detail,
                "container": docker_stats.get_container_info(compose_service),
            }
        )

    return {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "backend_uptime_seconds": round(time.monotonic() - _PROCESS_STARTED_AT, 1),
        "services": services,
    }
