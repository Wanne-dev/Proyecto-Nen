# Arranque con Docker — BANCA NEN

## Instalación local

Usa Docker Desktop o Docker Engine con Compose v2. Desde la raíz:

```sh
docker compose up -d --build --remove-orphans --wait --wait-timeout 180
docker compose ps -a
```

La web usa `http://localhost:5173`, la API publica `3000` y PostgreSQL `5433`, solo en loopback. `backend-migrate` es un proceso de una sola vez: debe terminar con `0`. `--remove-orphans` retira contenedores de servicios que ya no se usan en **ese proyecto**, como el Redis antiguo. No elimina volúmenes. Para detener sin retirar contenedores, `docker compose stop`; para retirar contenedores y red conservando los volúmenes, `docker compose down` **sin opciones de eliminación de volúmenes**.

No necesitas `.env` para los valores locales por defecto. Para personalizar PostgreSQL o integraciones, copia `.env.example` a `.env` en la raíz y conserva el archivo en privado. La clave independiente de TOTP se genera en el volumen `demo_auth_keys` si no defines `ENCRYPTION_KEY`.

## Actualizar una instalación existente

1. Respalda PostgreSQL y guarda de forma segura la clave de cifrado junto con el respaldo. Conserva tu `.env` raíz y `backend/.env` si usabas ejecución nativa. No publiques ninguno.
2. Extrae la entrega en una **carpeta nueva** para no conservar los archivos retirados. Copia a ella tu `.env` raíz si lo usabas. Si habías fijado `COMPOSE_PROJECT_NAME` o `-p`, vuelve a usar **el mismo nombre**. Por defecto es `banca-nen` en ambas versiones. Comprueba los volúmenes antes de arrancar, por ejemplo `docker volume ls --filter name=banca-nen_`.
3. Ejecuta el arranque desde la nueva carpeta. Si el proyecto era `banca-nen`, se conservan `banca-nen_postgres_demo_v17` y `banca-nen_demo_auth_keys`. El nombre histórico se mantiene para que PostgreSQL y las semillas TOTP sigan usando los mismos datos. No borres volúmenes ni cambies la contraseña de PostgreSQL del `.env` esperando que cambie en una base ya creada.
4. Comprueba salud y entra con tu cuenta existente. Si solo hay volúmenes antiguos de PostgreSQL 16 u otro esquema sin migración inicial registrada, **no los conectes directamente a PostgreSQL 17**: prepara una copia y verifica la migración/restauración aparte.

Las migraciones ya aplicadas conservan sus nombres y contenido. Si la base es más antigua y solo tiene la migración inicial, el migrador aplicará la migración de autenticación al iniciar; los códigos y sesiones de la versión previa a esa migración deben renovarse. Respalda antes de aplicar ese salto. Esta limpieza no agrega migraciones.

## Desarrollo híbrido

Con Node 22 y pnpm 9.15.4, puedes usar solo PostgreSQL en Docker. Detén antes los contenedores de web y API si ocupan `5173` o `3000`.

```sh
docker compose up -d --wait postgres
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Antes de `pnpm db:migrate`, copia `backend/.env.example` a `backend/.env` y configura `DB_*` para el PostgreSQL de Compose: `127.0.0.1:5433`, base y usuario `banca_nen`, contraseña según el `.env` raíz o el valor local histórico del YAML. Consulta [desarrollo sin Docker](sin-docker.md). No uses una clave TOTP distinta al arrancar de forma nativa sobre una base Docker ya poblada; para desarrollo aislado es preferible usar otra base o mantener la API en Docker.

## FastAPI opcional

Solo si quieres consultar la API de reglas Python, ejecuta `docker compose --profile analisis up -d --build --wait ia-service`. Queda en <http://localhost:8000/docs>. El frontend no lo usa, no necesita otra base y no conecta Start IA.

## Staging privado (bloqueado)

Usa Compose **2.26 o posterior**. Aplica la plantilla como sobreescritura del archivo base y usa una configuración privada distinta:

```sh
docker compose --env-file /ruta/privada/staging.env -f docker-compose.yml -f docker-compose.prod.yml up -d --build --wait --wait-timeout 180
```

Define `POSTGRES_PASSWORD`, `JWT_SECRET` aleatorio de al menos 32 bytes, `ENCRYPTION_KEY` independiente (64 caracteres hexadecimales) y `FRONTEND_URL=https://…`. Configura el proxy TLS delante del puerto de la web (`127.0.0.1:8080` por defecto). PostgreSQL y la API no publican puertos al host. El proyecto `banca-nen-staging` y el volumen `postgres_staging_v17` son distintos de los locales; **no sobrescribas el nombre con el del proyecto local**. Para operar sobre staging repite el mismo `--env-file` y ambos `-f` en cada comando.

`NODE_ENV=production` y `APP_MODE=locked` bloquean depósitos, retiros y nuevas órdenes simuladas. `EMAIL_PROVIDER=console` no imprime ni envía OTP en staging. No hay pagos activos. Mantén las claves privadas y no reutilices credenciales de otro entorno.
