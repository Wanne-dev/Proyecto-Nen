# RF-020: Panel de Administración

**ID:** RF-020  
**Nombre:** Panel de Administración  
**Prioridad:** Alta  
**Categoría:** Administración / Gestión  

---

## Descripción

El sistema proporciona un panel de administración para que los administradores gestionen usuarios, supervisen transacciones, controlen el cumplimiento normativo y monitoreen el estado general de la plataforma.

---

## Criterios de Aceptación

1. Solo usuarios con rol `admin` pueden acceder al panel de administración.
2. El panel incluye las siguientes secciones:
   - **Dashboard**: Estadísticas generales (usuarios, transacciones, volumen, alertas).
   - **Usuarios**: Gestión de usuarios (listar, ver detalle, suspender, verificar KYC).
   - **Transacciones**: Supervisión de transacciones (listar, filtrar, marcar sospechosas).
   - **Órdenes**: Monitoreo de órdenes de trading.
   - **Auditoría**: Consulta de logs de auditoría con verificación de integridad.
   - **Configuración**: Parámetros del sistema (comisiones, límites, maintenance mode).
3. Los administradores pueden suspender/cerrar cuentas de usuarios.
4. Los administradores pueden verificar/rechazar documentos KYC.
5. Los administradores pueden marcar transacciones como sospechosas.
6. Se registran todas las acciones de administración en el log de auditoría.
7. Se requieren 2 administradores para acciones críticas (suspender cuentas, cambios de configuración).

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/dashboard` | Estadísticas generales |
| GET | `/api/admin/users` | Lista usuarios |
| PUT | `/api/admin/users/:id/status` | Cambia estado de usuario |
| PUT | `/api/admin/users/:id/kyc` | Aprueba/rechaza KYC |
| GET | `/api/admin/transactions` | Lista transacciones |
| PUT | `/api/admin/transactions/:id/flag` | Marca transacción sospechosa |
| GET | `/api/admin/audit-logs` | Consulta logs de auditoría |
| GET | `/api/admin/settings` | Configuración del sistema |
| PUT | `/api/admin/settings` | Actualiza configuración |

---

## Response (Dashboard)

```json
{
  "success": true,
  "data": {
    "users": {
      "total": 15234,
      "active": 12890,
      "pending": 1890,
      "suspended": 454,
      "newToday": 67
    },
    "transactions": {
      "totalVolume24h": 2345000.00,
      "totalTransactions24h": 4521,
      "averageTransactionSize": 518.69,
      "suspiciousTransactions": 12
    },
    "trading": {
      "totalOrders24h": 8934,
      "activeOrders": 2345,
      "volume24h": 15670000.00
    },
    "alerts": {
      "suspiciousActivity": 12,
      "pendingKYC": 189,
      "failedLogins": 234
    }
  }
}
```

---

## Reglas de Negocio

- Solo usuarios con rol `admin` pueden acceder.
- Acciones críticas requieren doble aprobación (4-eyes principle).
- Todas las acciones de admin se registran en audit_logs.
- Los datos del dashboard se actualizan cada 60 segundos.
- Los administradores no pueden modificar su propia cuenta (prevención de conflicto).
- Se implementa rate limiting para prevenir abuso de la API admin.

---

## Dependencias

- Tabla `users` con campo `role` = admin.
- Tabla `audit_logs` para registro de acciones.
- Todas las tablas para consultas de estadísticas.
- Middleware de autorización por rol.
- Sistema de doble aprobación.

---

## Referencias

- SARLAFT - Controles administrativos.
- PCI DSS - Requirement 7: Restrict access to cardholder data.
- ISO 27001 - Access Control.
