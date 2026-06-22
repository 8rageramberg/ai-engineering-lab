"""Best-effort per-container resource signals via the Docker Engine API.

Chosen over shelling out to `docker stats`: the official `docker` Python SDK
talks to the daemon directly over the mounted socket — no extra CLI binary to
install in the image, and structured JSON instead of text to parse. Containers
are looked up by their `com.docker.compose.service` label (stable regardless
of the compose project name) rather than by guessing container names.

Every failure mode here — socket not mounted, daemon unreachable, container
not found, malformed stats — degrades to `None` rather than raising, so
/api/system-status stays useful (with `container: null`) in environments
without Docker access, e.g. a future non-compose deployment.
"""

import re
from datetime import datetime, timezone
from typing import Optional

import docker
from docker.errors import DockerException

_client = None
_client_unavailable = False


def _get_client():
    global _client, _client_unavailable
    if _client_unavailable:
        return None
    if _client is None:
        try:
            client = docker.from_env()
            client.ping()
        except DockerException:
            _client_unavailable = True
            return None
        _client = client
    return _client


def _uptime_seconds(started_at: Optional[str]) -> Optional[float]:
    if not started_at:
        return None
    # Docker reports nanosecond precision ("...123456789Z"); fromisoformat wants <= 6 fractional digits.
    trimmed = re.sub(r"(\.\d{6})\d*Z$", r"\1Z", started_at).replace("Z", "+00:00")
    try:
        started = datetime.fromisoformat(trimmed)
    except ValueError:
        return None
    return round((datetime.now(timezone.utc) - started).total_seconds(), 1)


def _cpu_percent(stats: dict) -> Optional[float]:
    try:
        cpu_usage = stats["cpu_stats"]["cpu_usage"]["total_usage"]
        precpu_usage = stats["precpu_stats"]["cpu_usage"]["total_usage"]
        system_usage = stats["cpu_stats"]["system_cpu_usage"]
        presystem_usage = stats["precpu_stats"]["system_cpu_usage"]
    except KeyError:
        return None

    cpu_delta = cpu_usage - precpu_usage
    system_delta = system_usage - presystem_usage
    if system_delta <= 0 or cpu_delta < 0:
        return None

    online_cpus = stats["cpu_stats"].get("online_cpus") or len(
        stats["cpu_stats"]["cpu_usage"].get("percpu_usage") or []
    ) or 1
    return round((cpu_delta / system_delta) * online_cpus * 100, 1)


def _memory(stats: dict) -> tuple[Optional[int], Optional[int], Optional[float]]:
    try:
        usage = stats["memory_stats"]["usage"]
        limit = stats["memory_stats"]["limit"]
    except KeyError:
        return None, None, None
    if not limit:
        return None, None, None

    # Docker's own `stats` subtracts page cache so idle containers don't look memory-hungry.
    detail = stats["memory_stats"].get("stats", {})
    cache = detail.get("inactive_file", detail.get("cache", 0))
    used = usage - cache
    return used, limit, round(used / limit * 100, 1)


def get_container_info(compose_service: str) -> Optional[dict]:
    client = _get_client()
    if client is None:
        return None

    try:
        containers = client.containers.list(
            filters={"label": f"com.docker.compose.service={compose_service}"}
        )
        if not containers:
            return None
        container = containers[0]
        stats = container.stats(stream=False)
        memory_used, memory_limit, memory_percent = _memory(stats)
        return {
            "name": container.name,
            "state": container.status,
            "uptime_seconds": _uptime_seconds(container.attrs.get("State", {}).get("StartedAt")),
            "cpu_percent": _cpu_percent(stats),
            "memory_used_bytes": memory_used,
            "memory_limit_bytes": memory_limit,
            "memory_percent": memory_percent,
        }
    except (DockerException, KeyError, TypeError):
        return None
