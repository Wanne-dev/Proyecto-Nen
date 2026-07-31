# Setup sin Docker — BANCA NEN (FinPredictor Pro)

> **Modo recomendado para:** entornos donde Docker no está disponible,
> máquinas con recursos limitados o cuando se prefiere control total sobre los servicios.

Cada servicio corre directamente en el sistema operativo:

| Servicio | Cómo corre | URL / Puerto |
|---|---|---|
| PostgreSQL | Instalado en el sistema local | `localhost:5432` |
| Redis | Instalado en el sistema local (opcional) | `localhost:6379` |
| Backend | `npm run dev` (ts-node-dev) | http://localhost:3000 |
| Frontend | `npm run dev` (Vite dev server) | http://localhost:5173 |

---

## Prerrequisitos

Instala las siguientes herramientas antes de comenzar:

| Herramienta | Versión mínima | Verificar con | Descargar |
|---|---|---|---|
| **Node.js** | 20 LTS+ | `node --version` | https://nodejs.org/ |
| **npm** | 10+ | `npm --version` | Incluido con Node.js |
| **PostgreSQL** | 17+ | `psql --version` | https://www.postgresql.org/download/ |
| **Git** | 2.40+ | `git --version` | https://git-scm.com/downloads |

> ⚠️ **Redis es opcional**. Si no está instalado, el sistema funciona sin cache (más lento pero funcional).

---

## Paso 1 — Clonar el repositorio

```bash
git clone https://github.com/Wanne-dev/Proyecto-Nen.git
cd Proyecto-Nen-main
```

---

## Paso 2 — Preparar PostgreSQL local

### Instalar PostgreSQL

**Windows:**

Descargar el instalador gráfico desde https://www.postgresql.org/download/windows/
El instalador incluye `psql`, `pgAdmin` y el servicio de Windows.

**Ubuntu / Debian:**

```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (Homebrew):**

```bash
brew install postgresql@17
brew services start postgresql@17
```

### Crear el usuario y la base de datos

```bash
# Conectarse a PostgreSQL como superusuario
sudo -u postgres psql          # Linux
psql -U postgres               # Windows / macOS
```

Dentro de la consola de PostgreSQL, ejecutar:

```sql
-- Crear el usuario de la aplicación
CREATE USER banca_nen WITH PASSWORD 'banca_nen_secret';

-- Crear la base de datos
CREATE DATABASE banca_nen OWNER banca_nen;

-- Habilitar extensión UUID
\c banca_nen
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Dar todos los privilegios
GRANT ALL PRIVILEGES ON DATABASE banca_nen TO banca_nen;

-- Salir
\q
```

Verificar la conexión:

```bash
psql -U banca_nen -d banca_nen -h localhost -c "SELECT version();"
# Deberías ver la versión de PostgreSQL instalada
```

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

# ── Base de Datos (PostgreSQL LOCAL) ──
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=banca_nen
DB_PASSWORD=banca_nen_secret
DB_DATABASE=banca_nen
DB_SSL=false

# ── Redis (opcional — si no está instalado, el sistema funciona sin cache) ──
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

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

> **Nota**: Sin Docker, el puerto de PostgreSQL es `5432` (el estándar), no `5433`.

**Generar secrets JWT seguros (recomendado para producción):**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copiar el resultado en JWT_ACCESS_SECRET=
# Repetir para JWT_REFRESH_SECRET= (usar un valor diferente)
```

### 3.3 Ejecutar el backend

```bash
# Modo desarrollo (con hot reload)
npm run dev
```

Salida esperada:

```
🚀 Servidor corriendo en http://localhost:3000
📊 Base de datos conectada: banca_nen@127.0.0.1:5432
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

## Paso 5 — Configurar emails (desarrollo local)

### Opción A — Sin emails (modo más simple)

El backend imprimirá el código de verificación directamente en la **consola** donde corre `npm run dev`. Copia el código desde la terminal para usarlo.

Esto funciona automáticamente si el SMTP no puede conectarse (fallback a `console.log`).

### Opción B — Gmail SMTP (recomendado si los puertos no están bloqueados)

1. Crear una cuenta de Gmail para el proyecto
2. Activar verificación en 2 pasos en la cuenta Google
3. Generar una App Password en https://myaccount.google.com/apppasswords
4. Configurar `SMTP_USER` y `SMTP_PASS` en `.env`

> **Nota SENA**: Los puertos SMTP (587/465) están bloqueados en la red SENA.
> Usar la Opción A o implementar Resend API (envío por HTTPS, no SMTP).

### Opción C — Resend API (envío por HTTPS, funciona en SENA)

Resend envía emails por HTTPS (puerto 443), que no está bloqueado:

```env
# Reemplazar la sección de email en .env
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_PROVIDER=resend
```

---

## Paso 6 — Instalar Redis (opcional)

Redis es opcional. Sin él, el sistema funciona sin cache (más lento pero funcional).

**Windows:**

Descargar desde https://github.com/tporadowski/redis/releases o usar WSL:

```bash
# Con WSL
sudo apt update && sudo apt install redis-server
sudo systemctl start redis-server
```

**Ubuntu / Debian:**

```bash
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**macOS:**

```bash
brew install redis
brew services start redis
```

Verificar:

```bash
redis-cli ping
# → PONG
```

---

## Paso 7 — Levantar el sistema (2 terminales)

### Terminal 1 — Backend (Express + TypeScript)

```bash
cd backend
npm run dev
```

Salida esperada:

```
🚀 Servidor corriendo en http://localhost:3000
📊 Base de datos conectada: banca_nen@127.0.0.1:5432
```

### Terminal 2 — Frontend (React + Vite)

```bash
cd frontend
npm run dev
```

Salida esperada:

```
VITE v5.x.x ready in xxx ms

➜  Local:   http://localhost:5173/
```

---

## Paso 8 — Verificar que todo funciona

Abrir en el navegador:

| URL | Qué muestra |
|---|---|
| http://localhost:5173 | Landing page de BANCA NEN |
| http://localhost:3000/api/health | JSON `{"status":"ok","timestamp":"..."}` |

Probar el flujo completo:

```bash
# 1. Registrar un usuario
curl -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"firstName\":\"Test\",\"lastName\":\"User\",\"documentType\":\"CC\",\"documentNumber\":\"1234567890\",\"dateOfBirth\":\"1995-05-15\",\"country\":\"Colombia\",\"phonePrefix\":\"+57\",\"phoneNumber\":\"3001234567\",\"email\":\"test@example.com\",\"password\":\"Test1234!\"}"

# 2. Ver el código de verificación en la consola del backend (Terminal 1)
#    Si el email funciona, revisar la bandeja de entrada

# 3. Verificar el email
curl -X POST http://localhost:3000/api/auth/verify-email ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"code\":\"123456\"}"

# 4. Login
curl -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"password\":\"Test1234!\"}"
```

---

## Comandos útiles del día a día

```bash
# ─── PostgreSQL ───
psql -U banca_nen -d banca_nen -h localhost   # consola interactiva
pg_dump -U banca_nen -Fc banca_nen > backup.dump  # respaldo
\dt                                             # listar tablas (dentro de psql)
\d users                                        # ver estructura de tabla

# ─── Redis (si está instalado) ───
redis-cli ping                                  # verificar conexión
redis-cli KEYS "*"                              # ver todas las claves
redis-cli FLUSHDB                               # eliminar todas las claves

# ─── Backend (Express) ───
cd backend
npm run dev                   # servidor con hot-reload
npm run build                 # compilar TypeScript → dist/
npm start                     # ejecutar compilado
npm run lint                  # verificar ESLint

# ─── Frontend ───
cd frontend
npm run dev                   # dev server con hot-reload
npm run build                 # compilar para producción
npm run preview               # preview de producción
npm run lint                  # verificar ESLint
```

---

## Solución de Problemas

### PostgreSQL no arranca (Windows)

```bash
# Verificar que el servicio está corriendo
net start postgresql-x64-17

# Si no está, iniciarlo
# Services → PostgreSQL → Iniciar
```

### Error "role banca_nen does not exist"

```bash
# Crear el rol manualmente
psql -U postgres -c "CREATE USER banca_nen WITH PASSWORD 'banca_nen_secret';"
psql -U postgres -c "CREATE DATABASE banca_nen OWNER banca_nen;"
```

### Error "connection refused" en puerto 5432

```bash
# Verificar que PostgreSQL está escuchando
netstat -ano | findstr :5432

# Verificar pg_hba.conf permite conexiones locales
# Asegurar que listen_addresses = 'localhost' en postgresql.conf
```

### El email no se envía (red SENA)

Usar Opción A (console.log) o implementar Resend API. Ver Paso 5.

---

**Proyecto:** BANCA NEN (FinPredictor Pro) | **Versión:** 1.0
