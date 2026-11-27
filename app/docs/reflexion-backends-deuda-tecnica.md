# Reflexión comparativa de los 4 backends y deuda técnica

## 1. Introducción

Durante el programa se trabajaron cuatro enfoques de backend: **Express**, **NestJS**, **FastAPI** y **Django**. BANCA NEN se implementó con **Express 4 + TypeScript + TypeORM + PostgreSQL**. Este documento compara los cuatro stack, explica por qué la implementación real quedó en Express y registra la deuda técnica pendiente, priorizada por riesgo y esfuerzo.

> Nota de trazabilidad: `docs/requisitos/RS/Restricciones-Proyecto.md` todavía describe NestJS 11, `class-validator` y `@nestjs/jwt`. El código real usa Express, Joi y `dotenv`. Esa diferencia se registra como **TD-01**.

## 2. Comparativa de los 4 backends

| Criterio | Express (usado) | NestJS | FastAPI | Django / DRF |
| --- | --- | --- | --- | --- |
| Paradigma | Minimalista, middleware | Opinionado, modular, DI | Async nativo, tipado por Pydantic | Baterías incluidas, MTV/DRF |
| Lenguaje | TypeScript | TypeScript | Python | Python |
| Enrutamiento | `router.get/post()` explícito | Decoradores `@Controller()` | Decoradores `@router` | `urls.py` + `views`/`ViewSet` |
| Validación | Joi en middleware | `class-validator` + DTO | Pydantic | Serializers de DRF |
| Inyección de dependencias | Manual / fábricas | DI nativa del framework | `Depends()` | Django apps + settings |
| ORM | TypeORM | TypeORM (`@nestjs/typeorm`) | SQLAlchemy 2 / Alembic | ORM de Django |
| Autenticación | JWT en cookies + sesiones en BD | Guards + Passport | `Depends(get_current_user)` | Sesiones o JWT con SimpleJWT |
| Manejo de errores | `AppError` + middleware | Exception Filters | `HTTPException` | Middleware + `APIException` |
| Async | `async/await` | `async/await` | `async def` | ASGI con async opcional |
| Configuración | `dotenv` + módulo propio | `@nestjs/config` | `pydantic-settings` | `settings.py` |
| Testing | Vitest + Supertest | Jest + Supertest | pytest + httpx | `pytest`/`unittest` + APIClient |
| Curva de aprendizaje | Baja | Media-alta | Media | Media |
| Mejor para | API REST pequeña/mediana con control fino | Sistemas grandes, equipos numerosos | Servicios de datos/IA y async | CRUD administrativo rápido |

## 3. Por qué Express en BANCA NEN

1. **Control explícito del ciclo de petición.** Interesa porque las cookies HttpOnly, la comprobación de origen, los guards de rol y la auditoría se ejecutan en un orden determinista.
2. **Dependencias ligeras.** La imagen de producción se construye con dependencias de producción y el arranque valida clave, esquema y base antes de aceptar tráfico.
3. **Tipado compartido.** TypeScript se reutiliza entre modelos TypeORM, validadores Joi y el frontend.
4. **Integraciones diversas.** Gemini, RSS de Google News, SMTP y cotizaciones se consumen con `fetch`/Nodemailer sin adapters de framework.
5. **Trabajo individual.** Una estructura de capas simple reduce sobrecarga frente a la DI de NestJS.

### Qué aportaría cada alternativa

- **NestJS:** DTOs y guards más formales; útil si el equipo crece y se quiere convención obligatoria. Coste: más ceremonia y migración de middlewares a módulos.
- **FastAPI:** ideal para el microservicio `ia-service` ya presente; Pydantic y `Depends()` harían más explícita la validación. No sustituye al backend de billetera por sí solo.
- **Django/DRF:** admin y ORM muy productivos para CRUD, pero añade otro lenguaje y su propio sistema de migraciones al ecosistema Node del proyecto.

## 4. Lecciones comparativas

- La **validación** debe vivir en la frontera HTTP y repetirse en el servicio cuando haya reglas de negocio; Joi y las clases `Money` ya cumplen ese papel.
- La **DI** de NestJS reduce acoplamiento, pero Express puede lograr un efecto similar con servicios exportados y mocks en Vitest.
- **FastAPI** conviene para cómputo (el `ia-service` de reglas), no para operaciones monetarias simuladas que ya tienen auditoría en PostgreSQL.
- En los cuatro stack, el riesgo real no es el framework sino **la consistencia transaccional**: saldo, movimiento y auditoría deben confirmarse juntos o revertirse juntos.

## 5. Registro de deuda técnica

| ID | Deuda | Severidad | Impacto | Prioridad | Esfuerzo | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| TD-01 | Documentación de requisitos exige NestJS; el código usa Express | Alta | Confusión en entrega y trazabilidad | **P0** | Media | Abierta |
| TD-02 | Credencial PostgreSQL fijada en `docker-compose.accesos.yml` | Alta | Exposición de secreto local | **P0** | Baja | Abierta |
| TD-03 | README y CI citan `docker-compose.yml`, que no existe | Media | Arranque documentado inválido | **P1** | Baja | README corregido; CI pendiente |
| TD-04 | 26 avisos de dependencias (3 críticas, 10 altas, 13 moderadas) | Media | Riesgo en build/dev; 3 de runtime | **P1** | Media | Planificado |
| TD-05 | Plan de pruebas no estaba consolidado | Media | Dificultad para repetir la verificación | **P1** | Baja | Corregida |
| TD-06 | `useWebSocket.ts` existe sin servidor socket.io activo | Baja | Código muerto / dependencia sin uso | **P2** | Baja | Abierta |
| TD-07 | Auditoría no es inmutable ante administrador de PostgreSQL | Media | Alcance de la garantía de integridad | **P1** | Alta | Aceptada con nota |
| TD-08 | Bonificación IoT no implementada | Baja | Puntos extra no cubiertos | **P2** | Media | Diseñada |
| TD-09 | Falta MER/UML visual (solo documentación textual) | Media | Rubro de documentación parcial | **P1** | Media | Abierta |
| TD-10 | Contraseña de aplicación SMTP en `perfil.env` local | Media | Rotación y custodia del secreto | **P1** | Baja | Abierta |

### Detalle de prioridades

- **P0 — corregir antes de cualquier despliegue:** TD-01 y TD-02.
- **P1 — cerrar en el siguiente sprint:** TD-03 (README ya corregido, CI pendiente), TD-04, TD-07, TD-09 y TD-10. TD-05 quedó corregida con el plan de pruebas.
- **P2 — mejoras diferidas:** TD-06 y TD-08.

El plan de remediación de dependencias ya está detallado en [auditoria-dependencias.md](referencia-tecnica/auditoria-dependencias.md#4-plan-de-remediación-siguiente-sprint-sin-romper-funcionalidad): `qs`, `uuid`, `react-router`, `vitest`, `vite` y `tar`.

## 6. Conclusión

Express fue una decisión coherente con el tamaño del equipo y con la necesidad de control transaccional. La deuda más urgente no está en el framework sino en la **documentación desactualizada** y en la **gestión de secretos locales**. Cerrar P0 y P1 deja el proyecto listo para una entrega académica consistente; P2 queda como evolución opcional.
