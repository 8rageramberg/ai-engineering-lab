"""The single backend wrapper through which all AI provider calls must go.

Per AGENT_CONTRACT.md, application code never calls Anthropic/OpenAI/etc.
directly — it goes through this module so usage stays observable, swappable,
and centrally rate-limited.

Wired to OpenAI's chat completions endpoint via the stdlib HTTP client (no SDK
dependency needed for one narrow call). The model is fixed to gpt-4o-mini —
the cheap-by-default tier TOKEN_BUDGET.md requires for any public-facing demo
agent.
"""

import json
import urllib.error
import urllib.request
from dataclasses import dataclass

from app.config import OPENAI_API_KEY

OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"
MODEL_NAME = "gpt-4o-mini"
REQUEST_TIMEOUT_SECONDS = 30


@dataclass
class AIResponse:
    text: str
    model_provider: str
    model_name: str
    input_tokens: int
    output_tokens: int


def complete(prompt: str, *, system: str | None = None, max_output_tokens: int = 200) -> AIResponse:
    """Single completion call, routed exclusively through gpt-4o-mini.

    `system` carries the scoping/system prompt, kept as a separate argument so
    callers can't blur the line between fixed instructions and user input.
    `max_output_tokens` is a hard cap passed straight to the provider — the
    caller decides how short an answer the feature can afford.
    """
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set — the demo agent has no live model to call")

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    body = json.dumps(
        {
            "model": MODEL_NAME,
            "messages": messages,
            "max_tokens": max_output_tokens,
            "temperature": 0.2,
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        OPENAI_CHAT_COMPLETIONS_URL,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI request failed ({exc.code}): {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"OpenAI request failed: {exc.reason}") from exc

    text = payload["choices"][0]["message"]["content"].strip()
    usage = payload.get("usage", {})
    return AIResponse(
        text=text,
        model_provider="openai",
        model_name=payload.get("model", MODEL_NAME),
        input_tokens=int(usage.get("prompt_tokens", 0)),
        output_tokens=int(usage.get("completion_tokens", 0)),
    )
