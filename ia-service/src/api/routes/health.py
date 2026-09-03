"""Endpoint de health check del servicio de IA."""

import time

from fastapi import APIRouter

router = APIRouter(tags=["health"])

_STARTED_AT = time.time()

MODEL_INFO = {
    "name": "NEN-Ensemble v3",
    "version": "3.1.0",
    "architecture": "LSTM + Random Forest + XGBoost (score compuesto de mercado)",
    "status": "ready",
    "features_count": 32,
}


@router.get("/health")
def health() -> dict:
    """Salud del servicio: siempre 200 si está vivo."""
    return {
        "status": "ok",
        "service": "BANCA NEN IA Service",
        "version": "1.0.0",
        "model": MODEL_INFO,
        "uptime_s": round(time.time() - _STARTED_AT, 1),
    }
