# API HTTP — BANCA NEN

Base servida al navegador: **`/api/v1`** del mismo origen. La documentación OpenAPI disponible se sirve en `/api/v1/docs/` y `/api/v1/docs-json`; los routers y validadores en [`backend/src`](../../backend/src/) son la referencia para detalles de cada petición. No se debe guardar ni enviar un JWT manual desde el frontend: el servidor establece las cookies `nen_access` y `nen_refresh`.

| Área | Rutas bajo `/api/v1` |
| --- | --- |
| Estado | `GET /health` informa si el esquema y la conexión están listos, sin exponer credenciales. |
| Acceso | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`; `GET /auth/profile`. El registro establece una sesión limitada a verificar. El login puede pedir un segundo paso con `twoFactorCode`. |
| Verificación y recuperación | `POST /auth/verify-email`, `/auth/verify-phone`, `/auth/resend-verification`, `/auth/forgot-password`, `/auth/reset-password`. Los códigos se entregan por el canal configurado, no en la respuesta HTTP. |
| Seguridad | `POST /auth/2fa/setup`, `/auth/2fa/confirm`, `/auth/2fa/disable`, `/auth/password`; `GET /auth/sessions` y `DELETE /auth/sessions/others` o `/auth/sessions/:id`. |
| Billetera | `GET /wallet`, `/wallet/balances`, `/wallet/transactions`; `POST /wallet/deposit` y `/wallet/withdraw` validan `currency` y `amount` y solo están disponibles localmente. |
| Órdenes | `GET /orders`, `POST /orders` con `symbol`, `type: "market"`, `side` y `quantity`; `DELETE /orders/:id` solo para órdenes abiertas o pendientes históricas. La cotización no la envía el cliente. |
| Mercado | `GET /market/quotes`, `/market/candles/:asset?range=24h`, `/market/book/:asset`. Los pares son `BTC`, `ETH`, `USDC` frente a USD; rangos `24h`, `7d`, `30d`. |
| Análisis | `GET /ia/predictions?assetId=…` devuelve estimaciones por reglas si hay insumos. `GET /ia/model` informa del método heurístico y del estado real del asistente, sin métricas de entrenamiento. |
| Asistente IA | `POST /ia/chat` con `{ "message": "…" }` (1–1000 caracteres) devuelve `{ reply, usedTools }`. Requiere sesión verificada, aplica límite por usuario y usa la clave privada `GEMINI_API_KEY` solo en el backend. Las herramientas del modelo consultan Binance/Kraken, Frankfurter y el RSS de Google News. |
| Perfil, reportes y personal | Routers `/user`, `/transactions`, `/reports`, `/notifications` y `/admin`. `/admin` comprueba rol y TOTP en la API. |
| Pagos | `POST /webhooks/wompi` responde `503`: no se procesan pagos. |

Todas las mutaciones del navegador pasan la comprobación de origen. Una sesión ausente o vencida devuelve `401`; una cuenta sin verificación, sin permisos o que intenta mutar saldos en un entorno bloqueado recibe `403`. Los formularios muestran errores del servidor sin guardar credenciales en almacenamiento web.

## Datos de mercado

Los endpoints de mercado devuelven `{ status, source, asOf, data }`. `fresh` y `stale` incluyen la última observación con fecha ISO de la respuesta del proveedor, no del último intercambio. Para `offline` y `unavailable`, `asOf` y `data` son `null`. Se sirven con `Cache-Control: no-store`. Se conserva temporalmente una copia real fechada (hasta 15 min en precios, 5 min en el libro y 60 min en el gráfico); el servidor no ejecuta órdenes con datos `stale`. El volumen se expresa en unidades del activo y la variación de precio del día toma como base las 00:00 UTC. Una orden sin cotización vigente responde `503` sin afectar saldos.
