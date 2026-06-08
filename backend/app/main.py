from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import CORS_ORIGINS
from app.demo_agent import service as demo_agent_service
from app.system_status import service as system_status_service
from app.telemetry import repository as telemetry_repository

app = FastAPI(title="AI Engineering Lab API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    question: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/telemetry/summary")
def telemetry_summary():
    return telemetry_repository.get_summary()


@app.get("/api/telemetry/daily-activity")
def telemetry_daily_activity():
    return telemetry_repository.get_daily_activity()


@app.get("/api/system-status")
def system_status():
    return system_status_service.get_status()


@app.post("/api/ask")
def ask(payload: AskRequest):
    try:
        return demo_agent_service.ask(payload.question)
    except demo_agent_service.InvalidQuestion as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except demo_agent_service.RateLimited as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail="The demo agent couldn't reach its model right now.") from exc
