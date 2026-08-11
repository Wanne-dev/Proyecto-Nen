# RF-011: Historial de Transacciones

**ID:** RF-011  
**Nombre:** Historial de Transacciones  
**Prioridad:** Media  
**Categoría:** Billetera / Finanzas  

---

## Descripción

El sistema permite al usuario consultar el historial completo de sus transacciones, con filtros avanzados por tipo, moneda, fecha y estado, facilitando el seguimiento y control de todas las operaciones financieras.

---

## Criterios de Aceptación

1. El usuario puede ver todas sus transacciones ordenadas por fecha (más reciente primero).
2. Se pueden filtrar transacciones por: tipo (depósito, retiro, compra, venta, transferencia), moneda, estado y rango de fechas.
3. Cada transacción muestra: fecha, tipo, moneda, monto, comisión, estado, y referencia.
4. Se puede buscar transacciones por número de referencia.
5. Se implementa paginación con 20 transacciones por página.
6. Se puede exportar el historial en formato CSV y PDF.
7. El historial muestra un resumen con totales por tipo de transacción.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/wallet/transactions` | Lista transacciones con filtros |
| GET | `/api/wallet/transactions/:id` | Detalle de una transacción |
| GET | `/api/wallet/transactions/export` | Exporta historial (CSV/PDF) |

---

## Query Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| type | string | Filtro por tipo: deposit, withdrawal, trade, transfer |
| currency | string | Filtro por moneda: USD, COP, BTC, etc. |
| status | string | Filtro por estado: pending, completed, failed, cancelled |
| fromDate | date | Fecha inicio (ISO 8601) |
| toDate | date | Fecha fin (ISO 8601) |
| page | number | Página (default: 1) |
| limit | number | Elementos por página (default: 20, max: 100) |
| search | string | Búsqueda por referencia |

---

## Response

```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "uuid",
        "reference": "DEP-20250115-001",
        "type": "deposit",
        "currency": "USD",
        "amount": 1000.00,
        "fee": 0.00,
        "status": "completed",
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    },
    "summary": {
      "totalDeposits": 15000.00,
      "totalWithdrawals": 5000.00,
      "totalTrades": 8200.00
    }
  }
}
```

---

## Reglas de Negocio

- Solo se muestran transacciones del usuario autenticado.
- La exportación tiene un límite de 10,000 registros por solicitud.
- Los datos de exportación se generan de forma asíncrona para grandes volúmenes.
- El CSV incluye todos los campos de la transacción.
- El PDF incluye formato con logo de la plataforma y resumen.

---

## Dependencias

- Tabla `transactions` con todos los campos de filtrado.
- Sistema de paginación.
- Servicio de generación de archivos (CSV/PDF).

---

## Referencias

- ISO 20022 - Financial Messaging Standards.
- Reglamento de transparencia financiera.
