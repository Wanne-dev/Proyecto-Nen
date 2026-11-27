# BANCA NEN · Cierre de la entrega local

> Registro histórico de una revisión anterior. Para instalar esta versión, sigue la [guía vigente](setup/como-probar.md). Los comandos, nombres y conteos de este registro corresponden a esa revisión.

**18 de noviembre de 2026 · Rama local `entrega-local`.** Esta entrega continúa `c5756e3` y sustituye su [informe de primera etapa](VALIDACION-LOCAL.md). No modifica `main` ni publica código. Validación limitada a una instalación local **de saldo virtual y cuentas ficticias**; no autoriza un despliegue financiero.

## Qué quedó implementado

| Área | Comportamiento de la instalación |
| --- | --- |
| Registro y verificación | Correo OTP de 10 minutos, cinco intentos por desafío y 60 segundos entre envíos. SMS separado si se configura; no se reutiliza el mismo código entre canales. Una cuenta pendiente solo puede completar su verificación. |
| Recuperación | Respuesta genérica a una solicitud de restablecimiento. Código ligado a la cuenta o enlace de un uso con el token en el fragmento. Cambiar la contraseña cierra sesiones, no desbloquea cuentas ni elimina TOTP. |
| TOTP | Confirmación antes de habilitarlo; rechazo de un paso ya usado. Baja con contraseña y un TOTP nuevo. Semilla cifrada con AES-256-GCM y una clave independiente del JWT. Sin códigos de respaldo. |
| Sesiones | Cookies `nen_access` y `nen_refresh` HttpOnly y SameSite Strict (también Secure en staging); acceso de 15 minutos, renovación rotativa almacenada por hash y vencimiento absoluto de siete días (24 horas para verificación). La API consulta la vigencia de la sesión, el estado y el rol en PostgreSQL. La web permite revocarlas. |
| Roles y permisos | Usuario sin panel de personal. Analista: métricas/reportes. Operador: métricas/reportes y lectura de usuarios. Cumplimiento: métricas/reportes, auditoría e integridad. Administrador: también modifica rol/estado de otras cuentas y puede cerrar el registro. Todo acceso de personal requiere 2FA. Cambiar rol o estado revoca las sesiones afectadas. |
| Auditoría | Eventos nuevos ordenados y encadenados por hash; el tramo legado se distingue del verificado. Las operaciones de saldo, órdenes y administración se auditan en su transacción. PostgreSQL bloquea la edición/borrado ordinarios de eventos; esto no hace la bitácora inmutable ante un administrador de la base. |
| Migración | `InitialSchema1795024800000` + `SecureBaseline1795024900000`. La segunda conserva datos de negocio, cifra un TOTP legado válido y descarta sesiones y desafíos legados. Si hay un TOTP legado inválido o teléfonos duplicados, detiene la actualización sin aplicar cambios. Antes de actualizar, respalda PostgreSQL y conserva la clave de cifrado. |

## Evidencia de ejecución

Entorno: Linux, Node **22.23.5**, pnpm **9.15.4**, PostgreSQL **17.11** en pruebas de integración y **17.12** en Docker, Playwright **1.65.1** con Chromium, Python **3.13**, Docker Engine **26.1.5** y Compose **2.26.1**.

| Verificación | Resultado |
| --- | --- |
| `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm build` | Pasaron. `bcrypt` cargó en la imagen final y la versión 6 verificó un hash de prueba emitido por la versión 5.1.1. |
| `pnpm lint` | **0 errores**, 58 avisos. |
| `pnpm test` | **82** API/backend y **19** web. |
| `pnpm test:postgres` | **22/22**. Probó actualización desde el esquema inicial con datos, aborto ante TOTP legado inválido, OTP de correo y SMS con buzones de prueba, refresco concurrente, revocación, recuperación no reutilizable, TOTP, permisos y transacciones del simulador. |
| FastAPI, `python -m pytest -q` | **6/6**; una advertencia de deprecación. **129** pruebas en total entre API, web, PostgreSQL y FastAPI, sin contar los recorridos de navegador y staging. |
| Docker local, `config --quiet` y `up -d --build --wait` | Pasaron ambos: no fue solo una validación del YAML. Migrador terminó con código **0**; PostgreSQL, Redis, API y web saludables; FastAPI respondió **200**. La API respondió **200** con `database: conectada` a través de Nginx en `localhost:5173`. Una repetición no aplicó ninguna migración y `schema:log` no encontró diferencias. |
| Docker staging, `config --quiet` y `up -d --build --wait` | Stack completo; migrador terminó con código **0**. Health **200** vía Nginx en `:8080` y proxy TLS local en `:8447`. Inicio/cierre de sesión con cuenta ficticia y cookies `Secure`, `HttpOnly` y `SameSite=Strict`. Depósito, retiro y orden devuelven **403** y el saldo no cambia. Wompi **503**; los códigos no aparecen en la consola. |
| Chromium sobre Docker/Nginx | Pasó registro, OTP correcto/incorrecto, rotación de cookie, recuperación desde enlace, revocación, edición del perfil, alta/baja de 2FA, login con TOTP, rechazo de código reutilizado, rol de operador de solo lectura con 2FA, bloqueo, cierre/reapertura del registro, integridad y logout. También completó el recorrido de saldo virtual; seis rutas a **390 px** sin desborde y recorrido completo sin excepciones de JavaScript. |
| `pnpm audit --prod` | Dos avisos críticos corregidos al actualizar `proxy-addr` y `bcrypt`. La repetición reportó **0 críticos, 20 altos, 35 moderados y 2 bajos**. El comando aún devuelve código 1 por los avisos restantes. |

### Regresión del simulador

Cotización fija de la instalación, sin consultar un proveedor externo. El efectivo y el valor total no son la misma cifra.

| Operación virtual | Efectivo USD | BTC | Valor total USD |
| --- | ---: | ---: | ---: |
| Depósito 100 USD | 100,00 | 0 | 100,00 |
| Compra 0,001 BTC por 50,00 USD; comisión 0,05 USD | 49,95 | 0,001 | 99,95 |
| Venta 0,0004 BTC por 20,00 USD; comisión 0,02 USD | 69,93 | 0,0006 | 99,93 |
| Retiro 20,00 USD; comisión 0,02 USD | 49,91 | 0,0006 | 79,91 |
| Compra 0,001 ETH + 5 USDC | 41,90 | 0,0006 | **79,90** |

PostgreSQL confirma además los depósitos concurrentes de 40 + 60 USD, el rechazo de una de dos compras concurrentes cuando no hay saldo para ambas y la reversión de saldo y movimiento si falla la auditoría.

## Repetir las pruebas

### Instalación y suites locales

Sigue [la guía rápida](setup/como-probar.md). Desde la raíz: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`. La [guía sin Docker](setup/sin-docker.md#pruebas-con-postgresql-real) describe cómo crear una base local vacía con sufijo `_test` para `pnpm test:postgres`. La suite usa buzones en memoria: no lee OTP en claro de la base. Para FastAPI usa `requirements-dev.txt` y `python -m pytest -q` en `ia-service/`.

### Chromium en la instalación local completa

En una terminal POSIX, con el Docker local, los puertos local libres y las dependencias Node instaladas desde el lockfile. No crees antes ningún administrador: el recorrido comprueba la CLI del primero y usa una base nueva. `playwright install --with-deps chromium` es una opción si faltan bibliotecas de Chromium en Linux.

```sh
export COMPOSE_PROJECT_NAME=nen-local-smoke
export FRONTEND_URL=http://localhost:5173 EMAIL_PROVIDER=console MARKET_OFFLINE=true
docker compose config --quiet
docker compose up -d --build --wait --wait-timeout 180
docker compose ps -a
npm install --prefix .cache/nen-playwright --no-save playwright@1.65.1
.cache/nen-playwright/node_modules/.bin/playwright install chromium
FIXTURE_OK=1 PLAYWRIGHT_MODULE="$PWD/.cache/nen-playwright/node_modules/playwright" node scripts/smoke-local.cjs
```

Los códigos se obtienen de la **consola local** del contenedor para correos `example.com`; el script no los imprime ni consulta las tablas de credenciales. Si repites, usa otro proyecto de pruebas vacío o retira el primero con `docker compose down -v` **solo si puedes borrar toda su base y su clave local**.

### Staging bloqueado con TLS de prueba

Con los puertos 8080 y 8447 libres, OpenSSL y un proyecto/volumen desechable. Estos comandos crean credenciales aleatorias locales: no copies un entorno real ni hagas commit del archivo. El script exige una base de staging vacía, crea una cuenta de prueba y verifica la API a través de un proxy con certificado temporal de `localhost`; no modifica un entorno remoto.

```sh
umask 077
mkdir -p .local
export COMPOSE_PROJECT_NAME=nen-stage-smoke
export STAGING_ENV_FILE="$PWD/.local/staging-smoke.env"
{
  printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)"
  printf 'JWT_SECRET=%s\n' "$(openssl rand -hex 32)"
  printf 'ENCRYPTION_KEY=%s\n' "$(openssl rand -hex 32)"
  printf 'FRONTEND_URL=https://localhost:8447\nWEB_PORT=8080\nEMAIL_PROVIDER=console\n'
} > "$STAGING_ENV_FILE"
docker compose --env-file "$STAGING_ENV_FILE" -f docker-compose.prod.yml config --quiet
docker compose --env-file "$STAGING_ENV_FILE" -f docker-compose.prod.yml up -d --build --wait --wait-timeout 180
STAGING_FIXTURE_OK=1 node scripts/smoke-staging.cjs
```

## Límites de la entrega

- Solo **Market simulado** de BTC, ETH y USDC; sin pagos Wompi (503), liquidación ni dinero real. No se incluye contabilidad de doble partida ni idempotencia de las operaciones financieras.
- No se probaron SMTP/Resend/Twilio reales, CoinGecko en línea, apps nativas, `INICIAR.bat` en Windows ni el CI remoto. La instalación existente fuera de esta copia y sus claves históricas no se modificaron.
- FastAPI calcula puntuaciones con **reglas**. No hay evidencia de modelo entrenado, explicabilidad SHAP ni backtesting; los rótulos históricos de IA no certifican esas funciones. Gráficos de trading ilustrativos, sin streaming de mercado. Reportes de la instalación son básicos.
- El análisis de dependencias no es un pentest ni una revisión de alcanzabilidad. Quedan avisos altos y moderados, y faltan diseño operativo, controles de privacidad y validación regulatoria antes de considerar dinero real.
