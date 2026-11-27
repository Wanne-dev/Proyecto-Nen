# Arranque local sin Docker — BANCA NEN

Requisitos: **Node 22**, **pnpm 9.15.4** y **PostgreSQL 17** instalado y escuchando localmente. No hace falta Redis, SMTP ni FastAPI. Las órdenes virtuales requieren una cotización pública de Kraken.

## 1. Crear una base local

En una instalación de PostgreSQL local, ejecuta estos comandos como administrador de la base. Si el rol `banca_nen` ya existe, no lo recrees; usa su contraseña o un rol local nuevo.

```sh
createuser -h 127.0.0.1 -U postgres --pwprompt banca_nen
createdb -h 127.0.0.1 -U postgres --owner=banca_nen banca_nen_local
```

Para una instalación nueva usa una base vacía. Si ya ejecutabas esta aplicación de forma nativa, conserva tu `DB_NAME`, `backend/.env` y la clave de cifrado; haz un respaldo antes de aplicar migraciones.

## 2. Configurar y arrancar

Desde la raíz del repo:

```sh
corepack enable
pnpm --version
pnpm install --frozen-lockfile
cp backend/.env.example backend/.env
```

En Windows, copia la plantilla con `Copy-Item backend/.env.example backend/.env`. En `backend/.env`, ajusta `DB_HOST=127.0.0.1`, `DB_PORT=5432` (o el puerto de tu instancia), `DB_USER=banca_nen`, `DB_NAME=banca_nen_local` y la contraseña del rol. Conserva `NODE_ENV=development`, `APP_MODE=virtual`, `EMAIL_PROVIDER=console` y `MARKET_OFFLINE=false` para consultar el mercado (cámbialo a `true` solo para probar sin conexión).

```sh
pnpm db:migrate
pnpm dev
```

Abre <http://localhost:5173>. Comprueba el estado en <http://localhost:5173/api/v1/health> y sigue el [recorrido manual](como-probar.md#recorrido-web-reproducible). Los códigos de registro de las cuentas ficticias aparecen en la terminal de la API. Si `JWT_SECRET` está vacío, la firma de acceso cambia al reiniciar; una sesión que conserve una renovación vigente puede volver a validarse. Para el cifrado de TOTP se genera **otra clave**, en `backend/.local/nen-auth.key` por defecto. Resguárdala fuera de Git junto con la base; no borres ni cambies esa clave si quieres conservar las semillas TOTP.

Para producción compilada, `pnpm build` genera `backend/dist/` y `frontend/dist/`. La migración compilada se ejecuta desde `backend/` con `node node_modules/typeorm/cli.js migration:run -d dist/data-source.js`, antes de `node dist/app.js`. El frontend necesita un servidor que sirva el SPA y reenvíe `/api` al backend. No basta con abrir `dist/index.html` como archivo. En `NODE_ENV=production` necesitas `JWT_SECRET`, `ENCRYPTION_KEY`, acceso por HTTPS y un proveedor autorizado de correo si quieres registrar usuarios; `APP_MODE=locked` es el modo predeterminado.

## Pruebas con PostgreSQL real

La suite **solo admite una base de datos local, vacía y desechable**, cuyo nombre termina en `_test`. Crea `banca_nen_test` con el rol local anterior, pero **no** le apliques la migración: la ejecuta y comprueba la prueba.

```sh
createdb -h 127.0.0.1 -U postgres --owner=banca_nen banca_nen_test
PG_TEST_DATABASE=1 DB_HOST=127.0.0.1 DB_PORT=5432 \
  DB_USER=banca_nen DB_NAME=banca_nen_test pnpm test:postgres
```

La contraseña se lee de `DB_PASSWORD` (del entorno o `backend/.env`). En PowerShell establece las mismas variables con `$env:NOMBRE = 'valor'` antes de `pnpm test:postgres`. Para repetir, crea **otra base `_test` nueva**; la existente conserva los resultados y no se modifica en un segundo intento.

Para FastAPI, aparte: en `ia-service/` instala `requirements-dev.txt` en un entorno virtual y ejecuta `python -m pytest -q`.
