# Configuración de entorno — BANCA NEN

| Archivo | Uso |
| --- | --- |
| `.env` en la raíz | Docker Compose. Opcional para instalación local; parte de `.env.example`. |
| `backend/.env` | API nativa. Parte de `backend/.env.example`; Compose no lo carga. |
| Archivo privado de staging | Solo con `--env-file` y ambos archivos Compose. No usar el `.env` local. |

| Variable | Comportamiento |
| --- | --- |
| `NODE_ENV`, `APP_MODE` | Normal: `development` / `virtual`. Staging: `production` / `locked`. Producción nunca habilita operaciones virtuales, aun si se cambia `APP_MODE`. El valor histórico `local` se acepta solo fuera de producción. |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Una conexión a PostgreSQL. Para usar `DATABASE_URL` deja `DB_HOST` vacío. En Docker usa `POSTGRES_PASSWORD` en la raíz para ambos servicios. |
| `DB_SSL` | `true` valida el certificado de PostgreSQL. Dentro del Compose local se usa `false`. |
| `HOST`, `PORT`, `FRONTEND_URL` | Entradas de red de la API y origen autorizado del frontend/enlaces de recuperación. Para staging, HTTPS a través del proxy. |
| `JWT_SECRET` | Local: si se omite, se genera por proceso y las sesiones vigentes pueden renovar el acceso. Staging: secreto aleatorio de al menos 32 bytes. |
| `ENCRYPTION_KEY`, `AUTH_KEY_FILE` | Clave de cifrado distinta del JWT, de 32 bytes en hexadecimal. Obligatoria en staging. En local se puede generar y guardar en archivo privado o en `demo_auth_keys`. Debe conservarse junto al respaldo de PostgreSQL. |
| `MARKET_OFFLINE` | `false` (valor local por defecto) habilita Kraken, Frankfurter y CoinGecko. `true` no consulta los proveedores, bloquea nuevas órdenes y movimientos no-USD sin cotización y deja disponible el USD virtual. `MARKET_OFFLINE` se lee solo si no se configuró el nombre nuevo. |
| `EMAIL_PROVIDER` y variables de proveedor | `console` entrega códigos solo fuera de producción. Usa [la guía de correo](../CONFIGURAR-CORREO.md) para SMTP o Resend. Twilio es opcional; no se necesitan sus credenciales para el recorrido local. |

No subas archivos privados de entorno ni claves. El arranque y la migración no necesitan Redis ni el servicio FastAPI.
