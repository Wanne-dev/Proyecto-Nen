# RF-015: Cancelación de Órdenes

**ID:** RF-015  
**Nombre:** Cancelación de Órdenes  
**Prioridad:** Media  
**Categoría:** Trading / Mercado  

---

## Descripción

El sistema permite al usuario cancelar órdenes pendientes que aún no han sido ejecutadas, liberando los fondos reservados y registrando la cancelación en el historial de la orden.

---

## Criterios de Aceptación

1. El usuario puede cancelar órdenes con estado `pending` o `open`.
2. No se pueden cancelar órdenes que ya fueron ejecutadas (`filled`) o están en proceso (`partial`).
3. Al cancelar, los fondos reservados se liberan inmediatamente en la billetera.
4. Se registra la cancelación con timestamp y motivo (si se proporciona).
5. Se envía notificación al usuario confirmando la cancelación.
6. Se registra en el log de auditoría.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| DELETE | `/api/orders/:id` | Cancela una orden pendiente |

---

## Response

```json
{
  "success": true,
  "message": "Orden cancelada exitosamente.",
  "data": {
    "orderId": "uuid",
    "reference": "ORD-20250115-001",
    "status": "cancelled",
    "releasedFunds": {
      "currency": "USD",
      "amount": 3425.05
    },
    "cancelledAt": "2025-01-15T11:00:00Z"
  }
}
```

---

## Reglas de Negocio

- Solo se pueden cancelar órdenes en estado `pending` o `open`.
- Los fondos se liberan inmediatamente al cancelar.
- Si la orden fue parcialmente ejecutada, solo se liberan los fondos no ejecutados.
- Se registra el motivo de cancelación si el usuario lo proporciona.
- Órdenes de mercado no se pueden cancelar (se ejecutan inmediatamente).
- Las órdenes expiran automáticamente después de 30 días si no se ejecutan.

---

## Dependencias

- Tabla `orders` con estados.
- Tabla `wallets` y `wallet_balances` para liberación de fondos.
- Tabla `audit_logs` para registro inmutable.
- Servicio de notificaciones.

---

## Referencias

- FIX Protocol - Order Cancel Request.
- Estándares de trading electrónico.
