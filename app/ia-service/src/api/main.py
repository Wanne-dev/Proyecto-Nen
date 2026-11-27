"""Configuración de la API opcional de análisis por reglas."""

from fastapi import FastAPI

from src.api.routes import health, prediction


def create_app() -> FastAPI:
    """Construye la aplicación FastAPI con sus routers."""
    app = FastAPI(
        title="BANCA NEN — Análisis por reglas",
        version="1.0.0",
        description=(
            "Evalúa los datos suministrados en la solicitud con reglas fijas. "
            "Devuelve un puntaje orientativo (0-100) "
            "y factores del cálculo. No consulta el mercado ni estima probabilidades."
        ),
    )

    app.include_router(health.router)
    app.include_router(prediction.router)

    @app.get("/", tags=["raíz"])
    def root() -> dict:
        return {"message": "Servicio de reglas activo", "docs": "/docs", "health": "/health"}

    return app


app = create_app()
