# RF-018: Auditoría de Acciones

**ID:** RF-018  
**Nombre:** Auditoría de Acciones  
**Prioridad:** Alta  
**Categoría:** Seguridad / Cumplimiento  

---

## Descripción

El sistema registra de forma inmutable todas las acciones realizadas por los usuarios y el sistema, implementando una cadena de hash para garantizar la integridad de los registros y cumplir con los requisitos de auditoría SARLAFT.

---

## Criterios de Aceptación

1. Se registra cada acción relevante con: usuario, acción, recurso, detalles, IP, timestamp.
2. Cada registro incluye un hash SHA-256 que se calcula con los datos del registro + hash del registro anterior (cadena inmutable).
3. Cualquier modificación de un registro anterior invalida toda la cadena de hash posterior.
4. El sistema detecta automáticamente si la cadena de hash ha sido comprometida.
5. Tipos de acciones auditadas:
   - **Auth**: Login, logout, password change, 2FA toggle.
   - **Transaction**: Deposits, withdrawals, trades.
   - **Wallet**: Balance changes, limit changes.
   - **KYC**: Document uploads, verification status changes.
   - **Admin**: User management, system configuration.
6. Los registros de auditoría son de solo lectura (no se pueden modificar ni eliminar).
7. Se puede consultar el log de auditoría con filtros avanzados (solo admin).

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/admin/audit-logs` | Consulta logs de auditoría (admin) |
| GET | `/api/admin/audit-logs/verify` | Verifica integridad de la cadena |

---

## Response

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "userId": "uuid",
        "action": "LOGIN",
        "resource": "auth",
        "details": {
          "method": "email_password",
          "ip": "192.168.1.100",
          "userAgent": "Chrome/120.0"
        },
        "hash": "a1b2c3d4e5f6...",
        "previousHash": "f6e5d4c3b2a1...",
        "timestamp": "2025-01-15T10:30:00Z"
      }
    ],
    "integrity": {
      "verified": true,
      "totalRecords": 15420,
      "lastVerifiedAt": "2025-01-15T10:00:00Z"
    }
  }
}
```

---

## Reglas de Negocio

- Los registros de auditoría son inmutables (INSERT ONLY).
- El hash se calcula como: SHA-256(id + userId + action + details + timestamp + previousHash).
- El primer registro tiene `previousHash` = "GENESIS".
- Se ejecuta verificación de integridad cada 24 horas automáticamente.
- Los registros se conservan por mínimo 5 años (cumplimiento regulatorio).
- Solo administradores pueden consultar los logs de auditoría.

---

## Dependencias

- Tabla `audit_logs` con campos de hash y previousHash.
- Función de hash SHA-256.
- Job programado para verificación de integridad.

---

## Referencias

- SARLAFT - Sistema de Administración del Riesgo de Lavado de Activos.
- ISO 27001 - Information Security Management.
- Blockchain-style audit trail pattern.
