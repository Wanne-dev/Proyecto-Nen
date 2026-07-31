# RF-016: Consulta de Órdenes

**ID:** RF-016  
**Nombre:** Consulta de Órdenes  
**Prioridad:** Media  
**Categoría:** Trading / Mercado  

---

## Descripción

El sistema permite al usuario consultar todas sus órdenes de trading, con filtros avanzados por estado, tipo, dirección y fecha, facilitando el seguimiento y gestión del portafolio de inversiones.

---

## Criterios de Aceptación

1. El usuario puede ver todas sus órdenes ordenadas por fecha (más reciente primero).
2. Se pueden filtrar por: estado (pending, filled, cancelled, expired), tipo (market, limit, stop_loss, take_profit), dirección (buy, sell), y rango de fechas.
3. Se muestra un resumen de órdenes: totales por estado, volumen total, P&L.
4. Se implementa paginación con 20 órdenes por página.
5. Se puede ver el detalle de cada orden con el historial de cambios de estado.
6. Se muestran métricas de rendimiento: win rate, profit factor, promedio de ganancia/pérdida.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/orders` | Lista órdenes con filtros |
| GET | `/api/orders/:id` | Detalle de una orden |

---

## Query Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| status | string | pending, filled, cancelled, expired |
| type | string | market, limit, stop_loss, take_profit |
| side | string | buy, sell |
| assetId | string | Filtro por activo |
| fromDate | date | Fecha inicio |
| toDate | date | Fecha fin |
| page | number | Página (default: 1) |
| limit | number | Elementos por página (default: 20) |

---

## Response

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "reference": "ORD-20250115-001",
        "type": "limit",
        "side": "buy",
        "asset": "BTC",
        "quantity": 0.05,
        "price": 65000.00,
        "total": 3250.00,
        "fee": 3.25,
        "status": "filled",
        "filledAt": "2025-01-15T14:30:00Z",
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 32,
      "totalPages": 2
    },
    "summary": {
      "totalOrders": 32,
      "filledOrders": 25,
      "pendingOrders": 3,
      "cancelledOrders": 4,
      "totalVolume": 45600.00,
      "realizedPnL": 1234.50
    }
  }
}
```

---

## Reglas de Negocio

- Solo se muestran órdenes del usuario autenticado.
- Las órdenes se muestran con el precio actual del activo para comparación.
- El P&L se calcula en tiempo real para órdenes filled.
- Se muestra el porcentaje de llenado para órdenes parcialmente ejecutadas.
- Las métricas de rendimiento se calculan sobre las últimas 100 órdenes.

---

## Dependencias

- Tabla `orders` con todos los campos de filtrado.
- Tabla `assets` para precios actuales.
- Sistema de paginación.

---

## Referencias

- FIX Protocol - Order Status Request.
- Estándares de reporting de trading.
