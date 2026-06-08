"""The single backend wrapper through which all AI provider calls must go.

Per AGENT_CONTRACT.md, application code never calls Anthropic/OpenAI/etc.
directly — it goes through this module so usage stays observable, swappable,
and centrally rate-limited. This is an interface stub: no real model call yet.
"""

from dataclasses import dataclass


@dataclass
class AIResponse:
    text: str
    model_provider: str
    model_name: str
    input_tokens: int
    output_tokens: int


def complete(prompt: str) -> AIResponse:
    """Stub completion call. Replace the body with a real provider call
    (still routed through this function) when the first AI feature lands."""
    raise NotImplementedError("AI client is a stubbed interface — no provider wired up yet")
