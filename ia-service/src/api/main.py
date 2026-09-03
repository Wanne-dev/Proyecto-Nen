"""Configuración principal de FastAPI del servicio de IA."""

from fastapi import FastAPI

from src.api.routes import health, prediction


def create_app() -> FastAPI:
    """Construye la aplicación FastAPI con sus routers."""
    app = FastAPI(
        title="BANCA NEN — IA Service",
        version="1.0.0",
        description=(
            "Servicio de scoring de inversión de BANCA NEN. "
            "Evalúa cada operación y devuelve un score de acierto (0-100) "
            "con su señal, nivel de riesgo y las variables más influyentes."
        ),
    )

    app.include_router(health.router)
    app.include_router(prediction.router)

    @app.get("/", tags=["raíz"])
    def root() -> dict:
        return {"message": "IA Service running", "docs": "/docs", "health": "/health"}

    return app


app = create_app()
