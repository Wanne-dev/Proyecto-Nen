# Validación de la limpieza — BANCA NEN

> Resultados históricos de la edición Limpio. El recorrido actual está en [Cómo probar](setup/como-probar.md).

## Alcance

- Se retiraron el dashboard sin ruta, los marcadores vacíos, el esqueleto móvil no operativo, el SQL de arranque histórico, el generador de modelos sin uso y los recursos públicos obsoletos. Se mantuvieron el video de acceso, la web adaptable, los requisitos escritos y la evidencia de revisiones anteriores.
- El arranque habitual ahora consta de PostgreSQL, el migrador, la API y la web. Se retiraron el contenedor y el adaptador de Redis y su dependencia resuelta. FastAPI queda como perfil explícito y no interviene en el portal. Staging sigue separado y bloqueado.
- `infra/` se conserva completa. Las migraciones versionadas no se modificaron. No se renombraron los volúmenes existentes ni la etiqueta persistida de PostgreSQL. No se borraron cuentas, órdenes, respaldos ni volúmenes del usuario.

## Comprobaciones ejecutadas

| Prueba | Resultado |
| --- | --- |
| Instalación y compilación | Node 22.23.5/pnpm 9.15.4, instalación con lockfile congelado, TypeScript de API y web, build y `git diff --check` correctos. Lint web: 0 errores, 46 avisos. |
| Suites de código | **141 pruebas aprobadas**: 88 API, 25 web, 22 de integración con PostgreSQL 17.12 y 6 de FastAPI. |
| Arranque local en Docker | Compose 2.26.1. Web por Nginx, API y PostgreSQL sanos; migrador `Exited (0)`. Dos migraciones registradas y `schema:log` sin cambios por aplicar. No se carga un cliente Redis en el runtime de TypeORM. |
| Actualización de una instalación poblada | Se inició `3d239ac` en un proyecto de pruebas distinto, se creó un administrador ficticio con TOTP, saldo, una orden y auditoría y se sustituyó por la versión nueva en el **mismo proyecto, con los mismos volúmenes**. Coincidieron la identidad, la clave de cifrado, los registros de migración y el saldo virtual (`69,95` USD en efectivo; `119,95` USD total). Se pudo entrar con el mismo TOTP y consultar el panel. |
| Chromium | Registro, código incorrecto y luego válido, cookies, `/dashboard` → `/asistente`, borrador sin escrituras, análisis sin datos con mercado desconectado, saldo y órdenes, recuperación, TOTP, revocación, administración y auditoría. Ocho rutas a 390 px sin desborde ni excepciones de JavaScript. El recorrido de [Cómo probar](setup/como-probar.md) acabó en `41,90` USD virtuales de efectivo y `79,90` USD virtuales de total. |
| Staging con TLS local | Volumen independiente; sin puertos publicados de PostgreSQL ni API. Cookies `Secure`, `HttpOnly` y `SameSite=Strict`. Depósito, retiro y nueva orden `403`; Wompi `503`; no se imprimió OTP. |
| Alta por terminal | Se ejecutó el cuerpo de `CREAR-ACCESO-NEN.cmd` en PowerShell 7.4 sobre Linux: usuario verificado, primer administrador con TOTP, acceso al panel y segundo intento de alta de administrador rechazado sin escribir otra cuenta. No se ejecutó `cmd.exe` de Windows. |
| Perfil FastAPI | La imagen arranca de forma independiente. `GET /health` identifica las reglas sin atribuir un modelo entrenado, y `POST /predict` calcula un resultado con los datos de la prueba. |

## Cómo repetir sin tocar una instalación existente

- Usa proyectos Compose y volúmenes **desechables**, no el proyecto `banca-nen` que ya utilices. Para la suite de base de datos, [crea una base `_test` nueva](setup/sin-docker.md#pruebas-con-postgresql-real).
- `scripts/smoke-local.cjs` requiere Chromium de Playwright, `LOCAL_FIXTURE_OK=1` un entorno de prueba con `MARKET_OFFLINE=true` y un nombre como `nen-local-smoke-01`. Verifica que no haya usuarios previos y crea cuentas ficticias. Usa `LOCAL_URL` si el sitio de pruebas no escucha en `http://localhost:5173`. Si Playwright está instalado aparte, `PLAYWRIGHT_MODULE` debe apuntar a ese módulo.
- `scripts/smoke-staging.cjs` requiere Node y OpenSSL. Aplica [ambos archivos de Compose](setup/con-docker.md#staging-privado-bloqueado) usando un proyecto desechable como `nen-stage-smoke-01`. Define `STAGING_FIXTURE_OK=1`, `STAGING_ENV_FILE` (el archivo privado usado por Compose) y `STAGING_TLS_PORT` (por defecto `8447`, que debe coincidir con `FRONTEND_URL=https://localhost:8447`). El script crea un proxy TLS local de prueba y exige una base sin usuarios.
- Se usaron únicamente instalaciones Linux desechables de Arena. Los resultados no corresponden al PC del usuario ni a CI remoto. No se probó un proveedor de pagos, correo o SMS real. El Asistente no tiene servicio de chat que probar.
- `pnpm audit --prod` informó **0 avisos críticos, 20 altos, 35 moderados y 2 bajos**. No hubo un análisis de alcanzabilidad ni una auditoría de producción; no es una certificación de seguridad.
