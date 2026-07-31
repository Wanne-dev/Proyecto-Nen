# RNF-004: Escalabilidad

**ID:** RNF-004  
**Nombre:** Escalabilidad  
**Categoría:** Rendimiento  
**Prioridad:** Media  

---

## Descripción

El sistema debe ser capaz de escalar horizontal y verticalmente para soportar el crecimiento en número de usuarios, transacciones y volumen de datos sin degradación significativa del rendimiento.

---

## Criterios de Aceptación

1. El sistema debe soportar al menos 10,000 usuarios concurrentes sin degradación.
2. La arquitectura basada en contenedores Docker permite escalar horizontalmente añadiendo instancias.
3. La base de datos debe soportar al menos 1,000 queries por segundo.
4. El sistema debe poder manejar picos de tráfico de hasta 5x la carga normal.
5. Los datos de mercado deben actualizarse para todos los usuarios conectados en menos de 5 segundos.
6. El almacenamiento de datos debe ser capaz de crecer sin límite práctico (particionamiento).

---

## Especificaciones Técnicas

### Capacidad

| Recurso | Capacidad Inicial | Capacidad Objetivo |
|---------|-------------------|-------------------|
| Usuarios concurrentes | 500 | 10,000 |
| Transacciones por segundo | 50 | 500 |
| Datos almacenados | 10 GB | 1 TB |
| Conexiones de BD | 50 | 200 |
| Requests API/minuto | 5,000 | 100,000 |

### Estrategias de Escalado

| Componente | Estrategia | Detalle |
|------------|-----------|---------|
| API Server | Horizontal | Replicar contenedores con load balancer |
| Base de datos | Vertical + Read Replicas | Escalar recursos + réplicas de lectura |
| Cache Redis | Cluster | Redis Cluster con particionamiento |
| WebSocket | Horizontal | Sticky sessions con Redis pub/sub |
| Archivos estáticos | CDN | Distribución geográfica |
| Colas de trabajo | Horizontal | Workers adicionales según demanda |

---

## Estrategias de Cumplimiento

- **Docker Compose**: Escalado con `docker-compose up --scale api=N`.
- **Nginx**: Load balancer con round-robin y health checks.
- **PostgreSQL**: Connection pooling (PgBouncer), read replicas, particionamiento de tablas.
- **Redis**: Cluster mode para cache distribuido.
- **TypeORM**: Queries optimizadas con índices y lazy loading de relaciones.
- **Paginación**: Evitar cargas masivas de datos.

---

## Referencias

- ISO/IEC 25010 - Software Quality - Capacity.
- AWS Well-Architected Framework - Performance Efficiency Pillar.
