from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.system_status import service as system_status_service
from app.telemetry import repository as telemetry_repository

app = FastAPI(title="AI Engineering Lab API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)


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
