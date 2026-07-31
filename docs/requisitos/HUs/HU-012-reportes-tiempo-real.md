# HU-012 — Reportes en Tiempo Real

## Identificación

| Campo | Valor |
| :--- | :--- |
| **ID** | HU-012 |
| **Título** | Reportes automatizados en tiempo real |
| **Módulo** | Reportes |
| **Prioridad** | Media |
| **Estado** | Por implementar |
| **RF asociados** | RF-014 |

---

## Historia

**Como** administrador,
**quiero** ver reportes en tiempo real sobre la actividad de usuarios, transacciones y rendimiento de IA,
**para** tomar decisiones basadas en datos y monitorear la salud del sistema.

---

## Criterios de Aceptación

### CA-012.1 — Dashboard de métricas en tiempo real
**Dado que** estoy en la sección "Reportes",
**cuando** veo el dashboard,
**entonces** debo ver métricas actualizadas cada 5 minutos: usuarios activos, nuevos registros (hoy, semana, mes), volumen de transacciones, monto total transado, rendimiento de IA (precisión, aciertos, fallos), y estado del sistema (uptime, errores, tiempo de respuesta).

### CA-012.2 — Selección de tipo de reporte
**Dado que** quiero generar un reporte,
**cuando** selecciono el tipo (Usuarios, Transacciones, Rendimiento IA, Estado del Sistema, Seguridad),
**entonces** el sistema muestra los datos correspondientes a ese tipo.

### CA-012.3 — Configuración del período
**Dado que** estoy generando un reporte,
**cuando** selecciono un período (hoy, ayer, última semana, último mes, último trimestre, o personalizado),
**entonces** el sistema filtra los datos según el período elegido.

### CA-012.4 — Exportación en múltiples formatos
**Dado que** el reporte está listo,
**cuando** selecciono el formato de exportación (PDF, Excel, CSV),
**entonces** el sistema genera el archivo correspondiente y lo descarga automáticamente.

### CA-012.5 — Reportes programados
**Dado que** quiero recibir reportes automáticos,
**cuando** configuro la programación (diario a las 6:00 AM, semanal los lunes a las 8:00 AM, mensual el 1er día del mes a las 8:00 AM),
**entonces** el sistema envía el reporte por email en el horario configurado.

### CA-012.6 — Almacenamiento en S3
**Dado que** un reporte es generado,
**cuando** el sistema lo completa,
**entonces** lo almacena en S3 con cifrado AES-256 y retención de 30 días.

### CA-012.7 — Notificación de reporte listo
**Dado que** un reporte bajo demanda ha sido generado,
**cuando** el sistema completa el proceso,
**entonces** recibo una notificación por email con el enlace de descarga.

### CA-012.8 — Historial de reportes
**Dado que** he generado reportes anteriormente,
**cuando** accedo a la sección "Reportes generados",
**entonces** debo ver la lista de todos los reportes generados en los últimos 30 días con su fecha, tipo y formato.

### CA-012.9 — Seguridad en reportes
**Dado que** un reporte contiene datos sensibles (transacciones, usuarios),
**cuando** el sistema lo genera,
**entonces** los datos sensibles se enmascaran (ej. números de documento parciales) y el acceso está restringido solo a administradores y compliance officer.

---

## Endpoints

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/v1/reports/dashboard` | Obtiene las métricas del dashboard |
| `POST` | `/api/v1/reports/generate` | Genera un reporte bajo demanda |
| `GET` | `/api/v1/reports` | Lista los reportes generados |
| `POST` | `/api/v1/reports/schedule` | Programa un reporte automático |
| `GET` | `/api/v1/reports/:id/download` | Descarga un reporte generado |

---

## Notas Técnicas

- Los reportes se generan en segundo plano mediante **Bull** (colas de trabajo) para no bloquear la interfaz.
- Los datos para los reportes se obtienen de las tablas `users`, `transactions`, `orders` y `audit_logs`.
- Los reportes se almacenan en **AWS S3** con cifrado AES-256 y retención de 30 días.
- Se utiliza **PDFKit**, **ExcelJS** y **csv-writer** para la exportación.
- Los reportes programados se ejecutan mediante un job recurrente en Bull.
- Los reportes de seguridad solo son accesibles por administradores y compliance officer.