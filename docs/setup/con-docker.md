# Setup con Docker — BANCA NEN (FinPredictor Pro)

> **Modo recomendado para:** desarrollo activo con hot-reload, depuración con IDE,
> demostraciones y entornos de clase.

En este proyecto, Docker gestiona la infraestructura (PostgreSQL y Redis),
mientras que el backend y frontend corren de forma nativa:

| Servicio | Dónde corre | URL / Puerto |
|---|---|---|
| `postgres` | Contenedor Docker | `localhost:5433` |
| `redis` | Contenedor Docker | `localhost:6380` |
| Backend | `npm run dev` (nativo) | http://localhost:3000 |
| Frontend | `npm run dev` (nativo) | http://localhost:5173 |

---

## Prerrequisitos

Antes de comenzar, instala estas herramientas:

| Herramienta | Versión mínima | Verificar con | Descargar |
|---|---|---|---|
| **Docker Desktop** | 24+ | `docker --version` | https://docs.docker.com/get-docker/ |
| **Docker Compose** | 2.20+ | `docker compose version` | Incluido con Docker Desktop |
| **Node.js** | 20 LTS+ | `node --version` | https://nodejs.org/ |
| **npm** | 10+ | `npm --version` | Incluido con Node.js |
| **Git** | 2.40+ | `git --version` | https://git-scm.com/downloads |

> ⚠️ **Windows**: Docker Desktop requiere WSL2 habilitado.
> Seguir la guía oficial: https://docs.docker.com/desktop/install/windows-install/

---

## Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/Wanne-dev/Proyecto-Nen.git
cd Proyecto-Nen-main
```

Verificar la estructura:

```bash
ls
# Deberías ver: frontend/ backend/ docker-compose.yml README.md ...
```

---

## Paso 2 — Levantar la infraestructura con Docker

```bash
# Inicia PostgreSQL y Redis en segundo plano
docker compose up -d
```

Verificar que los contenedores están corriendo:

```bash
docker compose ps
```

Deberías ver:

```
NAME                  IMAGE               STATUS
banca_nen_postgres    postgres:17-alpine  Up
banca_nen_redis       redis:7-alpine      Up
```

> Si los contenedores aparecen como `starting`, espera unos segundos y repite `docker compose ps`.

---

## Paso 3 — Configurar el Backend

### 3.1 Instalar dependencias

```bash
cd backend
npm install
```

### 3.2 Configurar variables de entorno

Crear el archivo `backend/.env` con el siguiente contenido:

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
SMTP_PASS=tu-app-password-aqui
EMAIL_FROM="BANCA NEN <oficialnenbank@gmail.com>"

# ── Frontend ──
FRONTEND_URL=http://localhost:5173

# ── CoinGecko API ──
COINGECKO_API_URL=https://api.coingecko.com/api/v3
```

**Generar secrets JWT seguros (recomendado para producción):**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copiar el resultado en JWT_ACCESS_SECRET=
# Repetir para JWT_REFRESH_SECRET= (usar un valor diferente)
```

> **Nota sobre la red SENA**: Los puertos SMTP (587/465) están bloqueados. El backend usa `console.log` como fallback cuando no puede enviar emails. El código de verificación aparecerá en la consola del backend.

### 3.3 Ejecutar el backend

```bash
# Modo desarrollo (con hot reload)
npm run dev
```

Salida esperada:

```
🚀 Servidor corriendo en http://localhost:3000
📊 Base de datos conectada: banca_nen@127.0.0.1:5433
```

TypeORM sincroniza automáticamente las tablas al iniciar (solo en desarrollo).

---

## Paso 4 — Configurar el Frontend

```bash
cd frontend
npm install
```

Crear el archivo `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=BANCA NEN
```

---

## Paso 5 — Levantar el sistema (2 terminales)

### Terminal 1 — Backend (Express + TypeScript)

```bash
cd backend
npm run dev
```

URLs disponibles:
- API: http://localhost:3000
- Health check: http://localhost:3000/api/health

### Terminal 2 — Frontend (React + Vite)

```bash
cd frontend
npm run dev
```

Salida esperada:

```
VITE v5.x.x ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## Paso 6 — Verificar que todo funciona

Abrir en el navegador:

| URL | Qué muestra |
|---|---|
| http://localhost:5173 | Landing page de BANCA NEN |
| http://localhost:3000/api/health | JSON `{"status":"ok","timestamp":"..."}` |

Probar la API directamente:

```bash
# Verificar que la API responde
curl http://localhost:3000/api/health
# → {"status":"ok","timestamp":"2025-..."}

# Registrar un usuario de prueba
curl -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"firstName\":\"Test\",\"lastName\":\"User\",\"documentType\":\"CC\",\"documentNumber\":\"1234567890\",\"dateOfBirth\":\"1995-05-15\",\"country\":\"Colombia\",\"phonePrefix\":\"+57\",\"phoneNumber\":\"3001234567\",\"email\":\"test@example.com\",\"password\":\"Test1234!\"}"
```

> **PowerShell**: Usar `^` para continuación de línea, o poner todo en una sola línea.

---

## Paso 7 — Comandos útiles del día a día

```bash
# ─── Docker — infraestructura ───
docker compose up -d          # levantar PostgreSQL + Redis
docker compose stop           # detener sin perder datos
docker compose start          # volver a iniciar
docker compose down           # detener y eliminar contenedores (datos persisten en volumen)
docker compose down -v        # ídem + borra volúmenes → ¡se pierden datos de la BD!

# ─── Ver logs de infraestructura ───
docker compose logs -f        # todos los servicios
docker compose logs -f postgres  # solo PostgreSQL

# ─── Consola de PostgreSQL ───
docker exec -it banca_nen_postgres psql -U banca_nen -d banca_nen

# ─── Consola de Redis ───
docker exec -it banca_nen_redis redis-cli

# ─── Backend (Express) ───
cd backend
npm run dev                   # servidor con hot-reload (ts-node-dev)
npm run build                 # compilar TypeScript → dist/
npm start                     # ejecutar compilado (producción)
npm run lint                  # verificar errores de ESLint

# ─── Frontend ───
cd frontend
npm run dev                   # dev server con hot-reload
npm run build                 # compilar para producción → dist/
npm run preview               # preview de producción
npm run lint                  # verificar errores de ESLint
```

---

## Paso 8 — Respaldo de la base de datos

```bash
# Crear respaldo completo
docker exec banca_nen_postgres pg_dump -U banca_nen -Fc banca_nen > backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump

# Restaurar desde respaldo
docker exec -i banca_nen_postgres pg_restore -U banca_nen -d banca_nen < backup.dump
```

---

## Solución de Problemas

### El backend no conecta a PostgreSQL

```bash
# Verificar que el contenedor está corriendo
docker ps | findstr banca_nen

# Verificar conectividad
docker exec -it banca_nen_postgres psql -U banca_nen -d banca_nen -c "SELECT 1"

# Verificar que el puerto 5433 está disponible
netstat -ano | findstr :5433
```

### Puerto en uso

```bash
# Ver qué proceso usa un puerto (PowerShell)
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# Terminar proceso por PID
taskkill /PID <PID> /F
```

### El email no se envía (red SENA)

Los puertos SMTP están bloqueados. El sistema usa `console.log` como fallback.
Busca el código de verificación en la consola del backend (Terminal 1).

---

**Proyecto:** BANCA NEN (FinPredictor Pro) | **Versión:** 1.0
