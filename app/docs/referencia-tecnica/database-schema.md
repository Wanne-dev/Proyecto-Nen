# PostgreSQL — BANCA NEN

La fuente de verdad es el esquema versionado en [`backend/src/migrations`](../../backend/src/migrations/). Las entidades de [`backend/src/models`](../../backend/src/models/) describen el mapeo de aplicación. El código no usa `synchronize` ni un segundo script SQL de arranque.

| Grupo | Tablas |
| --- | --- |
| Identidad y acceso | `users`, `user_sessions`, `verification_codes`, `user_settings` |
| Billetera y trading | `wallets`, `wallet_balances`, `transactions`, `orders` |
| Mercado | `assets`, `market_prices` (modelos disponibles; la web no requiere un feed almacenado) |
| Operaciones de la aplicación | `audit_logs`, `notifications`, `system_settings`, `webhook_logs` |
| Control de esquema | `migrations` (TypeORM) |

- `wallets` y los saldos se ligan a su titular; hay una fila por moneda en la billetera. Tipos monetarios `numeric` y cálculos con `decimal.js`. No depender de `float` para sumar saldos.
- Las mutaciones de órdenes de mercado y billetera guardan datos y auditoría en PostgreSQL. `quote_source` en órdenes identifica la referencia. Una orden completada no es una orden de un bróker.
- La semilla TOTP se guarda cifrada; las sesiones y verificaciones guardan comprobantes criptográficos en vez de secretos de renovación y OTP en claro. La clave de cifrado no reside en PostgreSQL.
- Los nombres de migraciones, tipos históricos y volúmenes deben mantenerse al actualizar. No se reescriben registros de operaciones ni de auditoría previos para cambiar terminología.

Para un cambio nuevo crea y revisa una migración antes de aplicarla. Comprueba una base vacía y otra con datos en copias privadas. Para actualizar, usa [la guía de respaldo y arranque](../setup/con-docker.md#actualizar-una-instalación-existente).
