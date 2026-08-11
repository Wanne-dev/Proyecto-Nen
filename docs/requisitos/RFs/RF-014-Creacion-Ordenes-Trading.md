# RF-014: Creación de Órdenes de Trading

**ID:** RF-014  
**Nombre:** Creación de Órdenes de Trading  
**Prioridad:** Alta  
**Categoría:** Trading / Mercado  

---

## Descripción

El sistema permite al usuario crear órdenes de compra y venta de criptomonedas, soportando múltiples tipos de órdenes (market, limit, stop-loss, take-profit) con validación de saldo y ejecución basada en precios de mercado en tiempo real.

---

## Criterios de Aceptación

1. El usuario puede crear órdenes de compra (BUY) o venta (SELL).
2. Se soportan los siguientes tipos de órdenes:
   - **Market**: Se ejecuta al precio actual del mercado.
   - **Limit**: Se ejecuta cuando el precio alcanza el valor especificado.
   - **Stop-Loss**: Se ejecuta cuando el precio cae al nivel especificado.
   - **Take-Profit**: Se ejecuta cuando el precio sube al nivel especificado.
3. El sistema valida que el saldo sea suficiente antes de crear la orden.
4. Para órdenes market, se muestra el precio actual y una estimación de ejecución.
5. Para órdenes limit/stop, se muestra la diferencia porcentual con el precio actual.
6. Se requiere confirmación del usuario antes de crear la orden.
7. Se cobra una comisión de 0.1% por operación de trading.
8. La orden se registra con estado `pending` hasta su ejecución o cancelación.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/orders` | Crea una nueva orden |

---

## Request Body (Market Order)

```json
{
  "type": "market",
  "side": "buy",
  "assetId": "bitcoin",
  "quantity": 0.05,
  "currency": "USD"
}
```

---

## Request Body (Limit Order)

```json
{
  "type": "limit",
  "side": "buy",
  "assetId": "bitcoin",
  "quantity": 0.05,
  "price": 65000.00,
  "currency": "USD"
}
```

---

## Response

```json
{
  "success": true,
  "message": "Orden creada exitosamente.",
  "data": {
    "orderId": "uuid",
    "reference": "ORD-20250115-001",
    "type": "market",
    "side": "buy",
    "asset": "BTC",
    "quantity": 0.05,
    "price": 68432.50,
    "total": 3421.63,
    "fee": 3.42,
    "netTotal": 3425.05,
    "status": "pending",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

---

## Reglas de Negocio

- Monto mínimo de orden: $10 USD o equivalente.
- Comisión de trading: 0.1% del total de la operación.
- El saldo se reserva al crear la orden y se libera si se cancela.
- Órdenes market se ejecutan inmediatamente al mejor precio disponible.
- Órdenes limit se ejecutan automáticamente cuando el precio alcanza el nivel.
- Stop-Loss y Take-Profit se ejecutan automáticamente cuando se activan.
- Se registra cada orden en el log de auditoría.

---

## Dependencias

- Tabla `orders` con todos los campos de la orden.
- Tabla `wallets` y `wallet_balances` para validación de saldo.
- Tabla `transactions` para registro de la operación.
- Tabla `audit_logs` para registro inmutable.
- Servicio de precios de mercado en tiempo real.
- Servicio de notificaciones.

---

## Referencias

- CoinGecko Trade API.
- Estándares de ejecución de órdenes (FIX Protocol).
