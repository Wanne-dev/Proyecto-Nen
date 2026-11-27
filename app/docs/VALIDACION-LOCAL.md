# BANCA NEN — primera mitad del plan de la instalación

> Registro histórico de una revisión anterior. Para instalar esta versión, sigue la [guía vigente](setup/como-probar.md). Los comandos, nombres y conteos de este registro corresponden a esa revisión.

> Histórico de `c5756e3`. Para el resultado que reemplaza esta entrega y las pruebas completas de Docker, consulta [la validación final](VALIDACION-SEGURIDAD-LOCAL.md).

**Validado el 18 de noviembre de 2026.** El cambio parte de `d47decb` y está en la rama local `entrega-local`. No se modificó `main` ni se hizo push. Se completó el bloque de arranque desde cero y la parte de billetera y órdenes Market del siguiente bloque. No es una entrega de banca real ni una nueva estimación del porcentaje de todo el proyecto.

## Qué quedó implementado

| Bloque | Cambio |
| --- | --- |
| Instalación | Lockfile de pnpm coherente con los manifiestos, Node 22 y pasos de arranque documentados. Imágenes Node configuradas para instalar desde el mismo lockfile. |
| Base de datos | Migración inicial versionada para PostgreSQL vacío: 14 tablas de dominio y la tabla `migrations`. El proceso web no crea ni sincroniza tablas. Compose separa el migrador del backend y comprueba la disponibilidad del esquema. |
| Simulador | Depósito y retiro virtuales, compra y venta Market de BTC, ETH y USDC, con cotización del servidor. Saldos, orden y movimiento se confirman en una transacción. La valoración incluye las posiciones cripto a su última tasa guardada. |
| Interfaz | Billetera virtual, referencias de movimientos y confirmación de la cotización y comisión de la orden. Los gráficos, el libro y los titulares de ejemplo no representan un flujo en vivo. |
| Límites | El modo `locked` rechaza depósitos, retiros y órdenes simuladas. El actor enlazado en auditoría solo devuelve su identificador, nombre y correo. Esto no sustituye la revisión de seguridad pendiente. |

## Pruebas ejecutadas

Entorno local: Node **22.23.5**, pnpm **9.15.4**, PostgreSQL **17.11** con bases desechables, Chromium con Playwright y Python **3.13** para FastAPI.

| Prueba | Resultado |
| --- | --- |
| `pnpm install --frozen-lockfile` | Pasó desde una carpeta de instalación sin `node_modules` previos. También cargó `bcrypt` con la instalación de dependencias de producción. |
| `pnpm typecheck` y `pnpm build` | Pasaron backend y frontend. |
| `pnpm lint` | Pasó en frontend: **0 errores**, **108 advertencias**. |
| `pnpm test` | **77** pruebas de backend y **19** de frontend pasaron. |
| `pnpm test:postgres` | **8/8** con PostgreSQL real. Comprueba registro/login, valoración, concurrencia, rollback, validaciones, proyección del actor y modo bloqueado. |
| `python -m pytest -q` en `ia-service` | **6/6**, con una advertencia de deprecación. |
| Arranque nativo de la API | `pnpm db:migrate` sobre una base nueva; health **200**; registro **201** y código leído de la consola y verificado **200**, sin proveedor externo. |
| API compilada con `NODE_ENV=production` | En base vacía se negó a arrancar y no creó tablas; tras la migración, health **200**. Una segunda ejecución no aplicó cambios; `schema:log` no reportó diferencias. |
| Chromium, frontend compilado y proxy `/api` | Pasó registro, OTP de prueba, depósito, compra, historial, venta y retiro. También se compraron ETH y USDC con el mercado externo desactivado. No se observaron excepciones de página; a **390 px** se comprobaron el menú y las páginas principales del recorrido sin desborde de la página. |
| API compilada en modo `locked` | Health **200**; depósito, retiro y creación de orden autenticados devolvieron **403**. El saldo no cambió. |
| Docker Compose local y staging | Ambos pasaron `config --quiet`. **No** hubo motor Docker en el entorno, así que no se construyeron imágenes ni se ejecutó `docker compose up` aquí. La CI queda configurada para comprobar el arranque en Docker cuando se ejecute en GitHub. |

La prueba de concurrencia confirmó que dos depósitos en paralelo (**40 + 60 USD**) se conservan en una sola billetera y que, si dos órdenes compiten por el mismo saldo, solo se registra la que puede pagarse. La prueba de rollback forzó un error al guardar un movimiento y confirmó que el saldo anterior se conserva.

## Resultado del recorrido en Chromium

| Operación virtual | Efectivo (USD) | BTC | Valor total (USD) |
| --- | ---: | ---: | ---: |
| Depósito de 100 USD | 100,00 | 0 | 100,00 |
| Compra 0,001 BTC a 50.000 USD/BTC; comisión 0,05 USD | 49,95 | 0,001 | **99,95** |
| Venta de 0,0004 BTC; comisión 0,02 USD | 69,93 | 0,0006 | 99,93 |
| Retiro de 20 USD; comisión 0,02 USD | 49,91 | 0,0006 | **79,91** |

Antes del cambio, el caso de compra mostraba **49,95 USD** como total porque la posición BTC no se valoraba. Ahora se presentan el efectivo y el total como cifras distintas. Con `MARKET_OFFLINE=true`, este recorrido no necesita CoinGecko. El OTP del smoke compilado se obtuvo solo de la base desechable de prueba; en el modo de desarrollo documentado aparece en la consola.

## Cómo repetirlo y qué queda pendiente

- [Guía rápida y valores esperados](setup/como-probar.md).
- [Arranque y pruebas con PostgreSQL local](setup/sin-docker.md).
- Para la segunda mitad: revisar autenticación, TOTP/2FA, sesiones, roles y auditoría; completar la prueba del Compose en un motor Docker y cerrar la entrega académica. La idempotencia de las operaciones aún no está implementada.
- No se probaron proveedores de correo/SMS, CoinGecko en línea, Wompi ni operaciones reales. Las claves antiguas del repositorio remoto no se rotaron. Los archivos de entorno privados y los scripts con credenciales no forman parte de esta copia.
- No uses datos personales ni dinero real. No apliques `db/init/01-datos.sql` ni la migración inicial a una base que ya contenga los datos de una instalación anterior.
