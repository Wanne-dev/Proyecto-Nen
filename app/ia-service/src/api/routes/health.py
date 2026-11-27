"""Salud del servicio opcional de reglas."""

import time

from fastapi import APIRouter

router = APIRouter(tags=["health"])

_STARTED_AT = time.time()

METHOD = {
    "name": "Reglas para evaluar operaciones",
    "kind": "heuristic",
    "trained": False,
    "calibrated": False,
    "source": "datos de entrada de la solicitud",
}


@router.get("/health")
def health() -> dict:
    """Salud del servicio: siempre 200 si está vivo."""
    return {
        "status": "ok",
        "service": "BANCA NEN — Análisis por reglas",
        "version": "1.0.0",
        "method": METHOD,
        "uptime_s": round(time.time() - _STARTED_AT, 1),
    }
