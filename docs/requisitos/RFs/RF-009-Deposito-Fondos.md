# RF-009: Depósito de Fondos

**ID:** RF-009  
**Nombre:** Depósito de Fondos  
**Prioridad:** Alta  
**Categoría:** Billetera / Finanzas  

---

## Descripción

El sistema permite al usuario realizar depósitos de fondos en su billetera virtual, especificando la moneda y el método de pago, con registro completo de la transacción y actualización automática del saldo.

---

## Criterios de Aceptación

1. El usuario puede seleccionar la moneda de depósito (USD, COP, EUR).
2. El usuario ingresa el monto a depositar.
3. El sistema genera una referencia de pago única para la transacción.
4. Se registra la transacción con estado `pending` hasta confirmación.
5. Al confirmarse el depósito, el saldo de la billetera se actualiza automáticamente.
6. Se genera una notificación al usuario confirmando el depósito.
7. Se registra la transacción en el log de auditoría con hash inmutable.
8. El sistema calcula y muestra las comisiones aplicables antes de confirmar.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/wallet/deposit` | Inicia un depósito de fondos |

---

## Request Body

```json
{
  "currency": "USD",
  "amount": 1000.00,
  "paymentMethod": "bank_transfer"
}
```

---

## Response

```json
{
  "success": true,
  "message": "Depósito iniciado exitosamente.",
  "data": {
    "transactionId": "uuid",
    "reference": "DEP-20250115-001",
    "currency": "USD",
    "amount": 1000.00,
    "fee": 0.00,
    "netAmount": 1000.00,
    "status": "pending",
    "paymentReference": "PAY-REF-123456"
  }
}
```

---

## Reglas de Negocio

- Monto mínimo de depósito: $10 USD o equivalente.
- Monto máximo por transacción: $50,000 USD o equivalente.
- Depósitos en criptomonedas no tienen comisión de depósito.
- Depósitos por transferencia bancaria pueden tardar 1-3 días hábiles.
- Se genera un hash de verificación para cada transacción.
- El depósito se refleja como `pending` hasta confirmación del gateway de pago.

---

## Dependencias

- Tabla `transactions` con tipo `deposit`.
- Tabla `wallets` y `wallet_balances` para actualización de saldos.
- Tabla `audit_logs` para registro inmutable.
- Integración con gateway de pago (Wompi para Colombia).
- Servicio de notificaciones.

---

## Referencias

- Wompi API Documentation.
- PCI DSS - Payment Card Industry Data Security Standard.
