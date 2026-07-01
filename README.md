# AI Engineering Lab

A full-stack portfolio project built in under 15 hours with AI coding agents, measuring itself as it went. Every coding session is logged as structured telemetry — tokens, cost, time — and displayed on a live dashboard.

**Live:** [ai-engineering-lab.vercel.app](https://ai-engineering-lab.vercel.app)

---

## What it is

This project is two things at once: a real application and a record of how it was built. The stack is deployed and running. The telemetry is real. The audit log documents where the numbers are accurate and where they are not.

The point was to answer: how fast can you go with AI coding agents, and how do you make that work transparent?

---

## Stack

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | Next.js 15 (React, TypeScript) | Vercel |
| Backend | FastAPI (Python 3.11), Docker | Render free tier |
| Database | PostgreSQL (Neon serverless) | Neon |
| AI model | gpt-4o-mini (demo agent) | OpenAI API |
| CI/CD | GitHub Actions (ci + deploy jobs) | GitHub |

---

## Architecture

```
Claude Code (local)
      |
   git commit
      |
   post-commit hook  ──────────────────────────────► Neon (events table)
      |                   reads transcripts,
      |                   sums tokens, writes row
      |
   git push
      |
   pre-push hook
      |  (pytest + npm build must pass)
      |
   GitHub
      |
   ┌──┴──┐
Vercel   Render
(Next.js) (FastAPI)
      |
     Neon
```

The git hooks are the telemetry backbone. The `post-commit` hook reads Claude Code's local transcript files, sums token usage by category, and writes one structured row to both a local JSONL file and the Neon database. No backend required — sessions show up on the dashboard before Render finishes deploying.

---

## Pages

- `/` — project overview in personal voice
- `/dashboard` — live telemetry: tokens, cost, hours, sessions, activity calendar, system pipeline status
- `/demo-agent` — a live gpt-4o-mini agent that answers questions about this project's telemetry and infrastructure
- `/telemetry-audit` — full transparency log: known data issues, fixes applied, token methodology, cache-read explanation

---

## Running locally

**With Docker Compose (recommended):**

```bash
# Copy and fill in the backend env (only needed for the demo agent)
cp backend/.env.example backend/.env
# edit backend/.env with your OPENAI_API_KEY

docker compose up
```

Frontend at `http://localhost:3000`, backend at `http://localhost:8000`.

**Without Docker:**

```bash
# Backend
cd backend
pip install -r requirements.txt
DATABASE_URL=postgresql://... uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 npm run dev
```

The backend requires a PostgreSQL database. For local development without Docker, set `DATABASE_URL` to any Postgres instance or use the Neon connection string from your `.env`.

---

## Git hooks

The hooks live in `scripts/git-hooks/` and are activated via:

```bash
git config core.hooksPath scripts/git-hooks
```

- **pre-push** — runs `pytest` and `npm run build` before any push. Failing tests block the push.
- **post-commit** — reads Claude Code transcripts, sums tokens per category, and writes a `coding_session_logged` event to both `docs/worklog/ai_sessions.jsonl` and the Neon database.

---

## Token methodology

Three token categories are logged per session:

| Category | Logged | Rate |
|---|---|---|
| Input (fresh prompts) | Yes | $3 / MTok |
| Output (Claude responses) | Yes | $15 / MTok |
| Cache-write (new context to cache) | Yes | $3.75 / MTok |
| Cache-read (context re-read from cache) | No — see audit log | $0.30 / MTok |

Cache-read tokens are excluded from the main count because they represent Anthropic re-sending prior conversation history on every message — not new prompts or output. At a 97% cache hit rate, including them would inflate the "tokens spent" figure 5–10x. They are tracked separately; the VS Code Claude Code extension estimated ~135M cache-read tokens (~$40) for the full project. See `/telemetry-audit` for the full accounting.

---

## Environment variables

**Backend** (`backend/.env`):

```
OPENAI_API_KEY=          # Required for the demo agent (/api/ask)
NEON_DATABASE_URL=       # Neon connection string (for the git hook's direct writes)
INTERNAL_API_SECRET=     # Shared secret for POST /api/events/internal (GitHub Actions)
```

**Frontend** (Vercel environment / `.env.local`):

```
NEXT_PUBLIC_API_BASE_URL=  # Backend URL (e.g. https://your-backend.onrender.com)
API_BASE_URL=              # Server-side backend URL (same or internal)
```

---

## Project structure

```
.
├── backend/              FastAPI application
│   ├── app/
│   │   ├── ai/           OpenAI client (model + cost abstraction)
│   │   ├── demo_agent/   /api/ask endpoint — the live demo agent
│   │   ├── events/       /api/events/internal — GitHub Actions webhook
│   │   ├── system_status/ /api/system-status — service health checks
│   │   └── telemetry/    /api/telemetry/* — session and cost aggregation
│   └── tests/
├── frontend/             Next.js application
│   └── src/app/
│       ├── dashboard/    Telemetry dashboard + live system status
│       ├── demo-agent/   Demo agent UI
│       └── telemetry-audit/ Transparency and methodology page
├── scripts/
│   ├── git-hooks/        post-commit (telemetry) + pre-push (validation)
│   └── log_ai_session.py Manual session logger (for sessions without commits)
├── docs/
│   ├── worklog/          ai_sessions.jsonl + WORKLOG.md
│   └── decisions/        DECISIONS.md (architecture decision log)
└── .github/workflows/    CI/CD pipeline (ci job gates deploy job)
```

---

## Data transparency

The numbers on the dashboard are estimates, not invoices. Known gaps are documented on the [audit log page](/telemetry-audit). The short version:

- Sessions before 2026-06-22 have inflated token counts from a cache-read misattribution bug (now fixed)
- One session with a 167-hour window (from a 7-day commit gap) was deleted
- Cache-read cost (~$40) is not included in any session estimate
- Cost estimates use Claude list-rate pricing, not actual billing data

---

## License

MIT
