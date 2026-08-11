# RF-008: Consulta de Billetera y Saldos

**ID:** RF-008  
**Nombre:** Consulta de Billetera y Saldos  
**Prioridad:** Alta  
**Categoría:** Billetera / Finanzas  

---

## Descripción

El sistema permite al usuario consultar el estado de su billetera virtual, visualizando los saldos disponibles en múltiples monedas y criptomonedas, junto con el valor total del portafolio en la moneda base seleccionada.

---

## Criterios de Aceptación

1. El usuario puede ver el saldo total de su billetera en la moneda base (USD por defecto).
2. Se muestran los saldos individuales por moneda: USD, COP, EUR, BTC, ETH, USDC.
3. Los saldos en criptomonedas se actualizan con precios de mercado en tiempo real.
4. Se muestra el cambio porcentual del valor total del portafolio en las últimas 24 horas.
5. El usuario puede cambiar la moneda base de visualización.
6. Se muestran los límites de la billetera (diario, mensual) según el nivel de verificación.
7. Se indica el retiro diario disponible restante.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/wallet` | Consulta billetera y saldos |

---

## Response

```json
{
  "success": true,
  "data": {
    "walletId": "uuid",
    "totalBalanceUSD": 15234.56,
    "change24h": 2.34,
    "currency": "USD",
    "balances": [
      { "currency": "USD", "amount": 5000.00, "valueUSD": 5000.00 },
      { "currency": "COP", "amount": 8500000, "valueUSD": 2048.19 },
      { "currency": "EUR", "amount": 1200.00, "valueUSD": 1310.40 },
      { "currency": "BTC", "amount": 0.05, "valueUSD": 3425.00 },
      { "currency": "ETH", "amount": 1.2, "valueUSD": 2890.97 },
      { "currency": "USDC", "amount": 560.00, "valueUSD": 560.00 }
    ],
    "limits": {
      "dailyWithdrawal": 5000,
      "dailyWithdrawn": 1200,
      "monthlyWithdrawal": 50000,
      "monthlyWithdrawn": 8500
    }
  }
}
```

---

## Reglas de Negocio

- Los precios de criptomonedas se actualizan cada 60 segundos desde CoinGecko.
- El saldo total se calcula convirtiendo todas las monedas a la moneda base.
- Las tasas de cambio para fiat se obtienen de API externa.
- Los saldos se muestran con el número apropiado de decimales según la moneda.
- Los límites dependen del nivel de verificación KYC del usuario.

---

## Dependencias

- Tabla `wallets` con balance y límites.
- Tabla `wallet_balances` con saldos por moneda.
- Tabla `assets` para precios de mercado.
- Servicio de precios de mercado (CoinGecko API).

---

## Referencias

- CoinGecko API Documentation.
- Estándares de contabilidad para activos digitales.
