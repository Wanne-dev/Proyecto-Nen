# RNF-010: Tolerancia a Fallos

**ID:** RNF-010  
**Nombre:** Tolerancia a Fallos  
**Categoría:** Fiabilidad  
**Prioridad:** Media  

---

## Descripción

El sistema debe ser capaz de continuar operando de forma parcial o completa cuando uno o más de sus componentes fallan, implementando mecanismos de fallback, recuperación automática y manejo elegante de errores.

---

## Criterios de Aceptación

1. Si la API de CoinGecko falla, el sistema muestra datos de mercado cacheados (última actualización válida).
2. Si Redis falla, el sistema opera sin cache (degradación de rendimiento, no de funcionalidad).
3. Si el servicio de email falla, el código de verificación se registra en consola como fallback.
4. Las transacciones financieras se ejecutan de forma atómica (todo o nada).
5. Los errores se capturan y manejan sin exponer detalles internos al usuario.
6. El sistema se reinicia automáticamente ante fallos de proceso (Docker restart policy).
7. Las conexiones a la base de datos se reestablecen automáticamente tras caídas.

---

## Especificaciones Técnicas

### Fallbacks por Servicio

| Servicio | Fallback | Comportamiento |
|----------|----------|----------------|
| CoinGecko API | Datos cacheados en Redis | Muestra última data + badge "Precios actualizados hace X min" |
| Redis | Sin cache | Queries directas a BD, más lentas pero funcionales |
| Email (SMTP) | Console.log | Código visible en logs del servidor, usuario puede contactar soporte |
| Base de datos | Connection retry | 3 reintentos con backoff exponencial (1s, 2s, 4s) |
| Gateway de pago | Marcar pending | Transacción queda pendiente, se reintentará automáticamente |

### Manejo de Errores

| Tipo | Código HTTP | Respuesta al Usuario |
|------|-------------|---------------------|
| Error de validación | 400 | Mensaje claro con campo específico |
| No autenticado | 401 | "Debe iniciar sesión" |
| No autorizado | 403 | "No tiene permisos para esta acción" |
| No encontrado | 404 | "Recurso no encontrado" |
| Conflicto | 409 | "El recurso ya existe" |
| Rate limit | 429 | "Demasiadas solicitudes, intente en X segundos" |
| Error interno | 500 | "Error interno del servidor, intente más tarde" |
| Servicio no disponible | 503 | "Servicio temporalmente no disponible" |

### Circuit Breaker

| Servicio | Umbral de Fallos | Tiempo de Espera | Estado |
|----------|-----------------|-------------------|--------|
| CoinGecko | 5 fallos en 30s | 60 segundos | Closed → Open → Half-Open |
| Email | 3 fallos en 60s | 120 segundos | Closed → Open → Half-Open |
| Redis | 3 fallos en 10s | 30 segundos | Closed → Open → Half-Open |

---

## Estrategias de Cumplimiento

- **Try/Catch**: Todas las operaciones asíncronas envueltas en try/catch.
- **Circuit Breaker Pattern**: Prevenir llamadas continuas a servicios caídos.
- **Fallback Data**: Datos cacheados como respaldo para servicios externos.
- **Docker Restart Policy**: `restart: always` en docker-compose.
- **Connection Retry**: Backoff exponencial para reconexiones.
- **Global Error Handler**: Middleware de Express que captura errores no manejados.
- **Transaction Rollback**: TypeORM transactions con rollback automático en error.

---

## Referencias

- ISO/IEC 25010 - Software Quality - Fault Tolerance.
- Circuit Breaker Pattern - Michael Nygard (Release It!).
- OWASP Error Handling Cheat Sheet.
