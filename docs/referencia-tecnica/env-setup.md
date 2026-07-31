# Configuración del Entorno — BANCA NEN (FinPredictor Pro)

## 1. Requisitos Previos

| Requisito | Versión | Verificación |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| npm | 10+ | `npm --version` |
| Docker Desktop | 20+ | `docker --version` |
| Docker Compose | 2+ | `docker compose version` |
| Git | 2.40+ | `git --version` |

---

## 2. Instalación Inicial

### 2.1 Clonar el repositorio

```bash
git clone https://github.com/Wanne-dev/Proyecto-Nen.git
cd Proyecto-Nen-main
```

### 2.2 Levantar servicios con Docker

```bash
docker compose up -d
```

Esto levanta:
- **PostgreSQL**: `banca_nen_postgres` en puerto `5433`
- **Redis**: `banca_nen_redis` en puerto `6380`

### 2.3 Verificar que los contenedores están corriendo

```bash
docker ps
```

Deberías ver:
```
CONTAINER ID   IMAGE              PORTS                    NAMES
xxxxxxxxxxxx   postgres:17        0.0.0.0:5433->5432/tcp   banca_nen_postgres
xxxxxxxxxxxx   redis:7-alpine     0.0.0.0:6380->6379/tcp   banca_nen_redis
```

---

## 3. Configuración del Backend

### 3.1 Instalar dependencias

```bash
cd backend
npm install
```

### 3.2 Variables de entorno

Crear el archivo `backend/.env` basado en el siguiente template:

```env
# ── Servidor ──
PORT=3000
NODE_ENV=development

# ── Base de Datos (PostgreSQL) ──
DB_HOST=127.0.0.1
DB_PORT=5433
DB_USERNAME=banca_nen
DB_PASSWORD=banca_nen_secret
DB_DATABASE=banca_nen
DB_SSL=false

# ── Redis ──
REDIS_HOST=127.0.0.1
REDIS_PORT=6380

# ── JWT ──
JWT_ACCESS_SECRET=banca_nen_access_secret_key_min_32_chars_2025
JWT_REFRESH_SECRET=banca_nen_refresh_secret_key_min_32_chars_2025
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# ── Email (Gmail SMTP) ──
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=oficialnenbank@gmail.com
SMTP_PASS=zarxiueqrxwuaebi
EMAIL_FROM="BANCA NEN <oficialnenbank@gmail.com>"

# ── Twilio (SMS - opcional) ──
TWILIO_ACCOUNT_SID=ACdfceb17ac5c8fc49cb5ee0e9aa5d2699
TWILIO_AUTH_TOKEN=3cf07a92f7ee3215dedbe48f9058dac3
TWILIO_PHONE_NUMBER=+18059982312

# ── Frontend ──
FRONTEND_URL=http://localhost:5173

# ── CoinGecko API ──
COINGECKO_API_URL=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=
```

> **Nota**: En la red SENA, los puertos SMTP (587/465) están bloqueados. El sistema usa `console.log` como fallback cuando el email no se puede enviar.

### 3.3 Ejecutar el backend

```bash
# Modo desarrollo (con hot reload)
npm run dev

# Compilar TypeScript
npm run build

# Ejecutar en producción
npm start
```

El backend se ejecuta en `http://localhost:3000`.

### 3.4 Verificar que la BD está conectada

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:
```json
{ "status": "ok", "timestamp": "2025-01-15T10:00:00.000Z" }
```

---

## 4. Configuración del Frontend

### 4.1 Instalar dependencias

```bash
cd frontend
npm install
```

### 4.2 Variables de entorno

Crear el archivo `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=BANCA NEN
```

### 4.3 Ejecutar el frontend

```bash
# Modo desarrollo
npm run dev

# Compilar para producción
npm run build

# Preview de producción
npm run preview
```

El frontend se ejecuta en `http://localhost:5173`.

---

## 5. Estructura de Puertos

| Servicio | Puerto | URL |
|---|---|---|
| Frontend (Vite) | 5173 | `http://localhost:5173` |
| Backend (Express) | 3000 | `http://localhost:3000` |
| PostgreSQL | 5433 | `localhost:5433` (mapeado desde 5432 interno) |
| Redis | 6380 | `localhost:6380` (mapeado desde 6379 interno) |

> **Nota**: Los puertos de BD usan 5433 y 6380 (no los estándar 5432/6379) para evitar conflictos con instalaciones locales existentes.

---

## 6. Docker Compose

El archivo `docker-compose.yml` en la raíz del proyecto:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:17-alpine
    container_name: banca_nen_postgres
    environment:
      POSTGRES_USER: banca_nen
      POSTGRES_PASSWORD: banca_nen_secret
      POSTGRES_DB: banca_nen
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  redis:
    image: redis:7-alpine
    container_name: banca_nen_redis
    ports:
      - "6380:6379"
    volumes:
      - redis_data:/data
    restart: always

volumes:
  postgres_data:
  redis_data:
```

---

## 7. Comandos Útiles

### Docker

```bash
# Levantar servicios
docker compose up -d

# Detener servicios
docker compose down

# Ver logs
docker compose logs -f

# Reiniciar un servicio
docker compose restart postgres

# Eliminar todo (incluyendo datos)
docker compose down -v
```

### Base de Datos

```bash
# Conectarse a PostgreSQL
docker exec -it banca_nen_postgres psql -U banca_nen -d banca_nen

# Listar tablas
\dt

# Ver estructura de una tabla
\d users

# Respaldar base de datos
docker exec banca_nen_postgres pg_dump -U banca_nen -Fc banca_nen > backup.dump

# Restaurar base de datos
docker exec -i banca_nen_postgres pg_restore -U banca_nen -d banca_nen < backup.dump
```

### Redis

```bash
# Conectarse a Redis
docker exec -it banca_nen_redis redis-cli -p 6379

# Ver claves
KEYS *

# Ver valor de una clave
GET "market:bitcoin"

# Eliminar todas las claves
FLUSHDB
```

---

## 8. Solución de Problemas

### El backend no conecta a PostgreSQL

```bash
# Verificar que el contenedor está corriendo
docker ps | grep banca_nen

# Verificar conectividad
docker exec -it banca_nen_postgres psql -U banca_nen -d banca_nen -c "SELECT 1"

# Verificar que el puerto 5433 está disponible
netstat -an | grep 5433
```

### El email no se envía (red SENA)

Los puertos SMTP (587/465) están bloqueados en la red SENA. El sistema automáticamente usa `console.log` como fallback. El código de verificación aparecerá en la consola del backend.

### CoinGecko API no responde

```bash
# Verificar conectividad
curl https://api.coingecko.com/api/v3/ping

# Si no responde, el sistema usa datos de fallback cacheados
```

### Puerto en uso

```bash
# Ver qué proceso usa un puerto (PowerShell)
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# Terminar proceso por PID
taskkill /PID <PID> /F
```

---

## 9. Git Workflow

```bash
# Cambiar a rama de desarrollo
git checkout dev

# Crear feature branch
git checkout -b feature/nombre-feature

# Hacer commit (Conventional Commits)
git add .
git commit -m "feat: descripción del cambio"

# Merge a dev
git checkout dev
git merge feature/nombre-feature

# Push
git push origin dev
```

---

**Proyecto:** BANCA NEN (FinPredictor Pro) | **Versión:** 1.0
