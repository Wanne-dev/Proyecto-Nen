# RF-010: Retiro de Fondos

**ID:** RF-010  
**Nombre:** Retiro de Fondos  
**Prioridad:** Alta  
**Categoría:** Billetera / Finanzas  

---

## Descripción

El sistema permite al usuario realizar retiros de fondos desde su billetera virtual, con verificación de seguridad adicional, validación de límites y registro completo de la transacción.

---

## Criterios de Aceptación

1. El usuario selecciona la moneda y monto a retirar.
2. El sistema verifica que el saldo disponible sea suficiente.
3. El sistema valida que el retiro no exceda los límites diarios/mensuales.
4. Se requiere verificación 2FA para completar el retiro.
5. Se muestran las comisiones y el monto neto antes de confirmar.
6. El usuario debe especificar la dirección/banco destino.
7. El retiro se procesa con estado `pending` y cambia a `completed` tras confirmación.
8. Se envía notificación al usuario en cada cambio de estado.
9. Se registra en el log de auditoría con hash inmutable.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/wallet/withdraw` | Inicia un retiro de fondos |

---

## Request Body

```json
{
  "currency": "USD",
  "amount": 500.00,
  "destination": {
    "type": "bank_account",
    "bankName": "Bancolombia",
    "accountNumber": "****1234",
    "accountType": "savings"
  },
  "twoFactorCode": "123456"
}
```

---

## Response

```json
{
  "success": true,
  "message": "Retiro procesado exitosamente.",
  "data": {
    "transactionId": "uuid",
    "reference": "WTH-20250115-001",
    "currency": "USD",
    "amount": 500.00,
    "fee": 5.00,
    "netAmount": 495.00,
    "status": "pending",
    "estimatedArrival": "1-3 días hábiles"
  }
}
```

---

## Reglas de Negocio

- Monto mínimo de retiro: $20 USD o equivalente.
- Se cobra comisión de 1% con mínimo de $5 USD.
- Verificación 2FA obligatoria para retiros.
- Límite diario: $5,000 USD (nivel básico), $50,000 USD (nivel verificado).
- Retiros a bancos colombianos se procesan via Wompi/PSE.
- Retiros de criptomonedas se envían a wallet externa con 1 confirmación de red.
- Se genera score de riesgo IA para transacciones sospechosas.

---

## Dependencias

- Tabla `transactions` con tipo `withdrawal`.
- Tabla `wallets` y `wallet_balances` para validación de saldo.
- Tabla `audit_logs` para registro inmutable.
- Middleware de verificación 2FA.
- Integración con gateway de pago.
- Servicio de notificaciones.

---

## Referencias

- Wompi API Documentation.
- SARLAFT - Controles de retiro.
- AML/KYT - Anti-Money Laundering / Know Your Transaction.
