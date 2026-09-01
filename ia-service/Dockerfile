# ──────────────────────────────────────────────────────────────
# BANCA NEN — IA service (FastAPI + Python)
# ──────────────────────────────────────────────────────────────
FROM python:3.11-slim
WORKDIR /app

# Copiar las dependencias e instalarlas primero (mejor caché)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src
EXPOSE 8000
# Por defecto la app arranca con uvicorn.
# Si usas gunicorn/uvicorn con workers, esto no cambia nada para desarrollo.
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
