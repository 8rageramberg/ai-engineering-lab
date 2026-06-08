"""Runtime configuration, sourced entirely from env vars.

Keeping connection strings and base URLs here (not hardcoded) is what lets the
frontend, backend, and database be pointed at different instances of each
other without code changes.
"""

import os

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://portfolio:portfolio@localhost:5432/portfolio",
)

CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

# Internal compose-network URL the backend uses to probe the frontend's
# reachability for /api/system-status — never exposed to browsers.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://frontend:3000")

# Read at runtime only — never hardcoded, never logged. Powers the demo agent's
# live gpt-4o-mini calls (see app/ai/client.py); absence simply means that
# feature degrades to an explanatory error rather than the app failing to boot.
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
