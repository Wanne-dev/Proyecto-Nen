# Plan de pruebas — BANCA NEN

## 1. Propósito

Documentar el alcance, los niveles, los ambientes y los criterios de aceptación de la verificación del proyecto. Este plan complementa el [informe histórico de ejecución](VALIDACION-SEGURIDAD-LOCAL.md) y las guías de [instalación](setup/con-docker.md) y [base exclusiva de pruebas](setup/sin-docker.md#pruebas-con-postgresql-real).

## 2. Alcance

**Incluye**

- Autenticación: registro, verificación de correo, recuperación, rotación de sesiones, 2FA del administrador y roles.
- Billetera virtual: depósitos, retiros, saldos por moneda y límites diarios.
- Trading simulado: compra/venta de BTC, ETH y USDC, comisiones y auditoría.
- Noticias: búsqueda RSS condicionada a trading, categorías, caché y análisis IA.
- Asistente `Start IA`: chat con Gemini, `Function Calling` por rol y redacción de PII.
- Correos transaccionales: verificación, recuperación, depósito, retiro, compra, venta y código 2FA del admin.
- API: contrato OpenAPI, códigos de estado y mensajes de error.
- Frontend: rutas, guards por rol, navegación y diseño responsive.

**Fuera de alcance**

- Dinero real, pasarela de pago (Wompi responde `503`), KYC externo y desembolsos.
- Entrenamiento de modelos, backtesting y predicciones calibradas.
- Dispositivos IoT: la propuesta está en [iot-raspberry-dht22.md](referencia-tecnica/iot-raspberry-dht22.md).
- Pruebas de carga extremas, pentest y certificación regulatoria.

## 3. Ambientes

| Ambiente | Uso | Aislamiento |
| --- | --- | --- |
| Desarrollo local | `perfil.env` + `local-base.compose.yml` + `docker-compose.accesos.yml` en `127.0.0.1:5184`. | Base `nen_demo_796ed55771`. No usar para datos reales. |
| Pruebas PostgreSQL | `pnpm test:postgres` con `PG_TEST_DATABASE=1`. | Base **vacía y desechable** `banca_nen_test`; la suite aplica la migración. |
| Pruebas de correo | SMTP real con buzón de prueba; lectura por IMAP para verificar entrega. | Cuenta de prueba; tokens y códigos nunca en logs. |
| Staging | `docker-compose.prod.yml` con volumen propio y mutaciones bloqueadas. | Secretos generados al vuelo; `APP_MODE=locked`. |
| CI | `.github/workflows/docker-image.yml`. | Postgres efímero, `pnpm test`, `test:postgres`, `pytest` y build Docker. |

> Regla: repetir `pnpm test:postgres` exige crear otra base `_test` nueva; la anterior conserva resultados y no se reutiliza.

## 4. Niveles de prueba

| Nivel | Objetivo | Herramienta | Comando |
| --- | --- | --- | --- |
| Unitario | Reglas puras, validadores y servicios con mocks | Vitest | `corepack pnpm --filter banca-nen-backend exec vitest run` |
| Unitario frontend | Componentes, formateadores y navegación | Vitest + Testing Library | `corepack pnpm --filter banca-nen-frontend exec vitest run` |
| Integración API | Rutas, cookies, guards y contrato HTTP | Supertest / Vitest | `pnpm test` |
| Integración PostgreSQL | Migraciones, transacciones y concurrencia | Vitest + `banca_nen_test` | `pnpm test:postgres` |
| E2E navegador | Recorridos completos y responsive | Playwright + Chromium | `node scripts/smoke-local.cjs` |
| Servicio IA | Reglas de puntuación de FastAPI | pytest | `python -m pytest -q` en `ia-service/` |
| Seguridad | Auditoría de dependencias y cabeceras | `pnpm audit`, revisión manual | `pnpm audit` |
| Correos reales | Entrega y contenido de cada plantilla | SMTP + IMAP de prueba | Verificación manual/script |

## 5. Matriz de casos

| ID | Módulo | Caso | Nivel | Resultado esperado | Estado |
| --- | --- | --- | --- | --- | --- |
| CP-001 | Auth | Registro con datos válidos | Integración | `201`, correo OTP entregado | Pasó |
| CP-002 | Auth | Código OTP correcto | Integración | Cuenta verificada | Pasó |
| CP-003 | Auth | OTP reutilizado | Integración | Rechazo | Pasó |
| CP-004 | Auth | Recuperación con correo registrado | Integración | Correo con código y enlace | Pasó |
| CP-005 | Auth | Cambio de contraseña | E2E | Login con clave nueva; sesiones cerradas | Pasó |
| CP-006 | Auth | Login admin sin 2FA | Integración | `requiresTwoFactor: true` | Pasó |
| CP-007 | Auth | Login admin con código por correo | Correo real | Acceso al panel | Pasó |
| CP-008 | Billetera | Depósito USD | Integración | Saldo actualizado y correo | Pasó |
| CP-009 | Billetera | Retiro con comisión | Integración | Saldo debitado y correo | Pasó |
| CP-010 | Billetera | Retiro sobre límite diario | Integración | `400`, sin cargo | Pasó |
| CP-011 | Órdenes | Compra BTC simulada | Integración | Orden `filled`, correo y auditoría | Pasó |
| CP-012 | Órdenes | Venta BTC simulada | Integración | Orden `filled`, correo y auditoría | Pasó |
| CP-013 | Órdenes | Compra sin saldo | Integración | Rechazo sin mutación | Pasó |
| CP-014 | Mercado | Cotización vigente | Integración | `source`, `asOf` y precio | Pasó |
| CP-015 | Noticias | Búsqueda condicionada a trading | Integración | 12 titulares reales | Pasó |
| CP-016 | Noticias | Análisis IA de titular | Integración | `sentiment`, `assets`, `impactSummary` | Pasó |
| CP-017 | IA | Chat con usuario sin herramienta admin | Unitario | `usedTools` sin `getAdminOverview` | Pasó |
| CP-018 | IA | Chat de administrador con resumen agregado | Integración | Datos agregados, sin PII al proveedor | Pasó |
| CP-019 | Admin | Cambio de rol y revocación de sesiones | Integración | Permisos aplicados | Pasó |
| CP-020 | Auditoría | Integridad de la cadena | Integración | `valid: true` | Pasó |
| CP-021 | UI | Navegación por rol | E2E | Sin secciones prohibidas | Pasó |
| CP-022 | UI | Seis rutas a 390 px | E2E | Sin desbordes | Pasó |
| CP-023 | API | Endpoints sin autenticación | Integración | `401` | Pasó |
| CP-024 | API | Documentación OpenAPI | Integración | `/api/v1/docs-json` responde `200` | Pasó |

## 6. Criterios de aceptación

1. **0** pruebas fallidas en las suites ejecutadas.
2. Health check con `database: conectada` y `email: smtp` cuando SMTP está configurado.
3. Ningún código OTP, token ni secreto aparece en logs ni en respuestas HTTP.
4. Los correos transaccionales llegan al buzón de prueba con asunto y plantilla correctos.
5. Las mutaciones de billetera y órdenes son atómicas: si falla la auditoría, se revierte el saldo.
6. El rol usuario nunca recibe herramientas de administración en `Start IA`.
7. La cadena de auditoría devuelve `valid: true`.
8. El frontend no muestra secciones de personal a un usuario normal.

## 7. Responsables y seguimiento

- **Responsable de pruebas y desarrollo:** Wane Lopez (trabajo individual).
- **Registro de defectos:** GitHub Issues del proyecto (enlace pendiente de adjuntar en la entrega).
- **Severidad:** Crítica / Alta / Media / Baja, según impacto en acceso, saldo o evidencia.
- **Estados:** Abierto → En progreso → Corregido → Verificado → Cerrado.

## 8. Reporte

Los resultados se consolidan en `docs/VALIDACION-SEGURIDAD-LOCAL.md` y se actualizan tras cada cambio relevante. La evidencia de correos reales se registra con asunto, destinatario y hora, sin incluir códigos ni secretos.
