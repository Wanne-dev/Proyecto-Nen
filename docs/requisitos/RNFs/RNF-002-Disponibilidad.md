# RNF-002: Disponibilidad

**ID:** RNF-002  
**Nombre:** Disponibilidad  
**Categoría:** Fiabilidad  
**Prioridad:** Alta  

---

## Descripción

El sistema debe mantenerse disponible y accesible para los usuarios durante la mayor parte del tiempo, garantizando continuidad del servicio de operaciones financieras que requieren atención 24/7.

---

## Métricas y Criterios de Aceptación

| Métrica | Valor Objetivo | Valor Mínimo |
|---------|----------------|--------------|
| Uptime anual | 99.9% | 99.5% |
| Uptime mensual | 99.95% | 99.5% |
| Tiempo máximo de inactividad no planificada | 1 hora | 4 horas |
| Ventana de mantenimiento planificado | 2 horas/mes | 4 horas/mes |
| RTO (Recovery Time Objective) | 15 minutos | 30 minutos |
| RPO (Recovery Point Objective) | 5 minutos | 15 minutos |

---

## Especificaciones Técnicas

1. El sistema debe estar disponible 24/7 con un mínimo del 99.9% de uptime anual.
2. Las ventanas de mantenimiento planificado se ejecutan en horario de baja demanda (2:00-4:00 AM UTC).
3. El sistema debe implementar health checks automáticos cada 30 segundos.
4. Los microservicios deben reiniciarse automáticamente ante fallos (restart policy: always).
5. La base de datos debe tener réplica en standby con failover automático.
6. El sistema debe degradarse de forma elegante (graceful degradation) ante fallos parciales.

---

## Estrategias de Cumplimiento

- **Docker**: Contenedores con restart policy y health checks.
- **Base de datos**: PostgreSQL con replicación y failover automático.
- **Reverse Proxy**: Nginx con load balancing y health checks.
- **Monitoreo**: Alertas automáticas cuando el servicio no responde.
- **Graceful Shutdown**: Las conexiones activas se completan antes de apagar.
- **Circuit Breaker**: Si un servicio dependiente falla, se usa fallback data.

---

## Plan de Contingencia

| Escenario | Acción | Tiempo de Recuperación |
|-----------|--------|------------------------|
| Caída del servidor | Failover automático a réplica | < 30 segundos |
| Caída de base de datos | Failover a standby | < 60 segundos |
| Caída de CoinGecko API | Datos de fallback cacheados | < 1 segundo |
| Caída de Redis | Degradación sin cache | Inmediato |
| Mantenimiento programado | Blue-green deployment | 0 segundos (sin downtime) |

---

## Referencias

- ISO/IEC 25010 - Software Quality - Availability.
- SLA estándar para plataformas fintech.
