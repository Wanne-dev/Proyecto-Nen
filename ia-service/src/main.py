"""Punto de entrada del servicio de IA de BANCA NEN.

Docker ejecuta:  uvicorn src.main:app --host 0.0.0.0 --port 8000

La aplicación real se construye en `src.api.main` (misma estructura que el
diseño original del proyecto); aquí solo se re-exporta `app` para que el
comando de arranque sea estable.
"""

from src.api.main import app  # noqa: F401

__all__ = ["app"]
