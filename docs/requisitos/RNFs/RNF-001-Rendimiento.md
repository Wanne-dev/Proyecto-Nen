# RNF-001: Rendimiento

**ID:** RNF-001  
**Nombre:** Rendimiento  
**Categoría:** Rendimiento  
**Prioridad:** Alta  

---

## Descripción

El sistema debe garantizar tiempos de respuesta óptimos en todas las operaciones críticas, proporcionando una experiencia fluida y sin esperas perceptibles para el usuario, incluso bajo condiciones de carga elevada.

---

## Métricas y Criterios de Aceptación

| Operación | Tiempo Máximo | Tiempo Objetivo |
|-----------|---------------|-----------------|
| Inicio de sesión | 2 segundos | 1 segundo |
| Consulta de billetera | 1.5 segundos | 0.5 segundos |
| Creación de orden | 2 segundos | 1 segundo |
| Carga de gráfica de precios | 3 segundos | 1.5 segundos |
| Listado de transacciones | 2 segundos | 1 segundo |
| Envío de código de verificación | 3 segundos | 1.5 segundos |
| Carga de página principal | 2 segundos | 1 segundo |
| Consulta de mercado | 3 segundos | 1.5 segundos |

---

## Especificaciones Técnicas

1. El tiempo de respuesta de la API debe ser inferior a 500ms en el percentil 95 (P95).
2. El tiempo de carga inicial de la aplicación frontend (First Contentful Paint) debe ser inferior a 2 segundos.
3. El Time to Interactive (TTI) no debe superar los 3 segundos.
4. Las consultas a la base de datos no deben superar los 200ms en condiciones normales.
5. El uso de caché Redis debe reducir los tiempos de respuesta en al menos un 60% para datos frecuentes.
6. Las operaciones de escritura deben procesarse de forma asíncrona cuando sea posible.

---

## Estrategias de Cumplimiento

- **Cache Redis**: Datos de mercado, sesiones, precios (TTL: 60s para mercado, 15min para datos estáticos).
- **Paginación**: Todas las listas deben implementar paginación (máximo 50 elementos por página).
- **Lazy Loading**: Imágenes y componentes pesados se cargan bajo demanda.
- **CDN**: Assets estáticos servidos desde CDN.
- **Compresión**: Gzip/Brotli para respuestas HTTP.
- **Connection Pooling**: Pool de conexiones a PostgreSQL (mínimo 10, máximo 50 conexiones).
- **Indexación**: Índices en tablas de alto volumen (transactions, orders, market_prices).

---

## Herramientas de Medición

- **Backend**: Middleware de logging con tiempos de respuesta por endpoint.
- **Frontend**: Lighthouse (Core Web Vitals), Web Vitals API.
- **Base de datos**: EXPLAIN ANALYZE para queries lentas.
- **Monitoreo**: Prometheus + Grafana para métricas en tiempo real.

---

## Referencias

- Google Core Web Vitals (LCP, FID, CLS).
- ISO/IEC 25010 - Software Quality - Performance Efficiency.
