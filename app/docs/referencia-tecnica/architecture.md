# Arquitectura ejecutable — BANCA NEN

## Arranque y fronteras

```text
Navegador ── mismo origen ── Nginx (Docker) / Vite (desarrollo)
                               │
                            /api/v1
                               │
                        Express + TypeORM ── PostgreSQL 17
                               │                 ▲
                               │            backend-migrate
                               └─ Kraken / Frankfurter / CoinGecko (solo lectura)

FastAPI opcional ── evalúa datos suministrados por su cliente
```

- **Un solo punto de entrada de FE.** `frontend/index.html` carga la aplicación React. `App.tsx` aplica las guardas y un layout según el rol. La interfaz de Start IA reside en `pages/assistant/`, sin endpoint ni almacenamiento de conversaciones. Las cinco pantallas públicas de acceso comparten `components/layout/AuthLayout.tsx` y la banda de cotizaciones que también usa la portada.
- **Misma configuración de persistencia.** API y migrador importan `AppDataSource` desde `config/database.ts`. Las entidades se registran explícitamente y `synchronize` está deshabilitado. El arranque normal no necesita otro motor de persistencia. Hay caché breve de cotizaciones y limitación de peticiones en memoria por proceso, no una cola de tareas activa ni rate limiting distribuido. pnpm excluye el cliente opcional de Redis que TypeORM ofrecía como peer, ya que la aplicación no activa esa caché.
- **Entornos separados.** `docker-compose.yml` es el arranque local. Staging se define mediante una sobreescritura con nombre y volumen propios, TLS externo y escrituras virtuales bloqueadas. La antigua `infra/` se archivó en `docs/infra-archivo/`, pero no contiene la configuración con que arrancan estos servicios.

## Cómo viaja cada operación

| Flujo | Lugar y alcance |
| --- | --- |
| Acceso | El cliente usa `/api/v1` con cookies. El middleware valida sesión, alcance y estado contra PostgreSQL; no confía en el rol del token por sí solo. La verificación y el reset dejan los códigos fuera de la respuesta. |
| Billetera/orden | Joi valida la petición, las guardas comprueban la sesión y si se habilitan operaciones virtuales. La API determina la cotización y hace el cálculo decimal. PostgreSQL serializa cambios del mismo usuario y registra saldo, movimiento, orden y auditoría dentro de la transacción correspondiente. |
| Mercado | Express lee precios, velas, volumen y niveles de Kraken. La caché caduca y conserva solo observaciones válidas durante un tiempo acotado. Para COP y EUR en la billetera usa tasas diarias de Frankfurter. Sin una referencia vigente no se permiten nuevas órdenes. |
| Análisis de mercado | Express consulta CoinGecko si está habilitado. `ia.service.ts` genera estimaciones y factores con una fórmula determinista. Los horizontes son ilustrativos, no pruebas de que los precios vayan a alcanzarse. No hay entrenamiento, mediciones de precisión ni inferencia conversacional. |
| Servicio Python opcional | `/predict` recibe insumos de mercado del cliente y calcula un puntaje por reglas con ajuste por lado de orden. No consulta la base, no lo llama el frontend y no alimenta Start IA. |
| Personal | El backend exige sesión activa y TOTP confirmado para acceder al personal. La administración y el CLI inicial usan el mismo bloqueo de mutaciones; solo se permite el primer administrador desde el CLI local. |

## Alcance de los controles

`SameSite=Strict`, cookies de sesión `HttpOnly` (más `Secure` bajo HTTPS en staging), control de origen para mutaciones, OTP de uso acotado y semilla TOTP cifrada con clave independiente. La auditoría de la aplicación es de anexado con hash encadenado; no es inalterable para un administrador de PostgreSQL. Revisar [configuración](env-setup.md), [contratos HTTP](api-endpoints.md) y [esquema](database-schema.md).

Es una aplicación de operaciones simuladas. No incluye contabilidad financiera integral, idempotencia de pagos, mecanismos de custodia, KYC de proveedor, licencia de datos, ni certificación de seguridad o de cumplimiento. Son proyectos separados de la interfaz y del arranque local, no opciones que se activen con una variable.
