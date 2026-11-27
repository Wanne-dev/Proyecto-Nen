# BANCA NEN

Proyecto SENA · Análisis y Desarrollo de Software.

Aplicación web con **saldo virtual y operaciones simuladas**. El inicio autenticado es **Start IA**, un asistente conectado a Gemini con `Function Calling` por rol: el usuario puede consultar precios y noticias, y el administrador recibe además un resumen agregado sin exponer PII al proveedor. La pestaña **Noticias** integra un buscador de titulares financieros con análisis IA. El análisis de mercado conserva estimaciones orientativas calculadas con reglas fijas.

## Arranque local

Abre Docker Desktop o inicia Docker Engine (Docker Compose v2) y, desde la carpeta `app`, ejecuta:

```sh
docker compose --env-file ../perfil.env -f local-base.compose.yml -f ../docker-compose.accesos.yml up -d --build --wait --wait-timeout 300
```

En Windows también puedes ejecutar `INICIAR.bat` desde la carpeta `BANCA-NEN`. Abre <http://banca-nen.localhost:5184> y comprueba [la salud de la aplicación](http://banca-nen.localhost:5184/api/v1/health). El arranque habitual usa **un PostgreSQL 17**. Un migrador aplica el esquema antes de que la API acepte conexiones. No se necesita Redis ni FastAPI para el recorrido local; **Start IA** requiere `GEMINI_API_KEY` configurada solo en el backend.

Para preparar las dos cuentas locales ejecuta `INICIAR.bat` desde la carpeta `BANCA-NEN`. Para obtener el código 2FA del administrador usa `CODIGO-ADMIN.bat`; el código también se envía al correo configurado para esa cuenta. No se cambia una cuenta existente al repetir el proceso.

**Si ya tienes una instalación:** conserva el mismo proyecto Compose (`banca-nen` por defecto) y sus volúmenes, el `.env` privado y la clave de cifrado. Revisa [cómo actualizar sin perder datos](docs/setup/con-docker.md#actualizar-una-instalación-existente) antes de iniciar la versión nueva. No necesitas reiniciar el registro ni ejecutar un SQL manual.

## Qué funciona y cuáles son los límites

| Área | Implementación actual |
| --- | --- |
| Acceso | Registro y verificación, recuperación, revocación de sesiones y TOTP. El panel de personal requiere 2FA confirmado. |
| Portal | Start IA como inicio, pestaña **Noticias** y un [sidebar Liquid Glass](docs/SIDEBAR-LIQUID-GLASS.md) compartido por usuario y administrador. Billetera, trading, historial, reportes y ajustes conservan sus rutas. `/dashboard` redirige a `/asistente`. |
| Billetera y órdenes | Depósito/retiro virtual y compra/venta de BTC, ETH y USDC con comisión calculada en el servidor. La API guarda el origen de la referencia, el precio de ejecución y el movimiento. |
| Administración | Gestión de usuarios, control de registro y auditoría. La cadena ayuda a detectar alteraciones; no es inmutable ante un administrador de la base. |
| Mercado | BTC, ETH y USDC contra USD en Kraken: cotizaciones, velas, volumen y libro de órdenes. Se consulta por intervalos; se indica la fuente y la hora de consulta. Si no hay referencia vigente, no se admiten nuevas órdenes. |

Las tasas para valorar movimientos virtuales en COP y EUR son referencias diarias de Frankfurter. La billetera conserva el valor de las operaciones registradas, no muestra una valoración en tiempo real. Las estimaciones independientes se calculan a partir de CoinGecko, no son recomendaciones ni probabilidades calibradas. Si tu `.env` anterior contiene `MARKET_OFFLINE=true`, cambia solo esa opción a `false` para activar el mercado y vuelve a arrancar.

**Fuera del alcance actual:** operaciones con dinero real, pasarela de pago activa, KYC externo, app móvil nativa y entrenamiento de modelos. El asistente usa un modelo existente sin entrenamiento propio. El [entorno privado de validación](docs/setup/con-docker.md#staging-privado-bloqueado) bloquea las mutaciones virtuales y no certifica una operación financiera.

## Guías del proyecto

- [Recorrido funcional y alta desde CMD](docs/setup/como-probar.md).
- Instalación: [Docker e híbrida](docs/setup/con-docker.md) · [sin Docker](docs/setup/sin-docker.md) · [variables](docs/referencia-tecnica/env-setup.md) · [correo](docs/CONFIGURAR-CORREO.md).
- Referencia: [arquitectura](docs/referencia-tecnica/architecture.md) · [API](docs/referencia-tecnica/api-endpoints.md) · [esquema](docs/referencia-tecnica/database-schema.md).
- [Validación de New IA y mercado](docs/VALIDACION-NEW-IA.md) · [validación de la limpieza previa](docs/VALIDACION-LIMPIEZA.md) · [plan de pruebas](docs/plan-de-pruebas.md).
- [Diseño IoT propuesto (Raspberry Pi + DHT22)](docs/referencia-tecnica/iot-raspberry-dht22.md) · [reflexión de backends y deuda técnica](docs/reflexion-backends-deuda-tecnica.md).
- [Requisitos de diseño](docs/requisitos/vision-original.md). No son una lista de funciones ya desplegadas.

```text
backend/     API Express/TypeScript, modelos TypeORM, migraciones y pruebas
frontend/    React/Vite, portal web adaptable y Nginx para Docker
ia-service/  FastAPI opcional; analiza los datos que envía el cliente
infra/       Archivada en docs/infra-archivo/; no es el punto de entrada de Docker Compose
scripts/     Comprobaciones para instalaciones de prueba desechables
```

Para desarrollar, usa Node 22 y pnpm 9.15.4. `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm lint` y `pnpm build` se ejecutan desde la raíz. `pnpm test:postgres` requiere una [base exclusiva de pruebas](docs/setup/sin-docker.md#pruebas-con-postgresql-real).

## Pruebas

| Nivel | Comando | Resultado documentado |
| --- | --- | --- |
| Unitario backend | `corepack pnpm --filter banca-nen-backend exec vitest run` | 106/106 |
| Unitario frontend | `corepack pnpm --filter banca-nen-frontend exec vitest run` | 46/46 |
| Integración API | `pnpm test` | Incluido en el informe de ejecución |
| PostgreSQL real | `PG_TEST_DATABASE=1 pnpm test:postgres` sobre `banca_nen_test` | 22/22 en el informe histórico |
| Servicio IA | `python -m pytest -q` en `ia-service/` | 6/6 en el informe histórico |
| Navegador | `node scripts/smoke-local.cjs` | Recorridos y responsive a 390 px |

El [plan de pruebas completo](docs/plan-de-pruebas.md) define alcance, ambientes, matriz de casos, criterios de aceptación y responsables. El [informe de ejecución](docs/VALIDACION-SEGURIDAD-LOCAL.md) conserva la evidencia histórica de 129 pruebas y los recorridos de Chromium y staging.

## API documentada

- **Swagger UI:** <http://banca-nen.localhost:5184/api/v1/docs>
- **OpenAPI JSON:** <http://banca-nen.localhost:5184/api/v1/docs-json>
- **Referencia rápida:** [api-endpoints.md](docs/referencia-tecnica/api-endpoints.md)

Todas las rutas de negocio viven bajo `/api/v1`: autenticación y 2FA, billetera, órdenes, mercado, noticias, asistente IA, reportes, notificaciones y administración. Las rutas de noticias también están disponibles como alias `/api/news` y `/api/news/analyze`. La autenticación usa cookies `nen_access` y `nen_refresh` HttpOnly; una sesión ausente responde `401` y una cuenta sin permisos o sin verificación responde `403`. La clave `GEMINI_API_KEY` solo se usa en el backend y nunca aparece en la documentación ni en respuestas.

## Licencia y contribuciones

[MIT](LICENSE) · [Guía de contribución y código de conducta](CONTRIBUTING.md#6-código-de-conducta) · [Seguridad](SECURITY.md). Autor original: Wane Lopez.
