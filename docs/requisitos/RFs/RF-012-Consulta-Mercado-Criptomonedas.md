# RF-012: Consulta de Mercado de Criptomonedas

**ID:** RF-012  
**Nombre:** Consulta de Mercado de Criptomonedas  
**Prioridad:** Alta  
**Categoría:** Trading / Mercado  

---

## Descripción

El sistema permite al usuario consultar información actualizada del mercado de criptomonedas, incluyendo precios en tiempo real, capitalización de mercado, volumen de negociación y tendencias, obtenidos desde la API de CoinGecko.

---

## Criterios de Aceptación

1. El usuario puede ver una lista de las principales criptomonedas con su precio actual, cambio 24h, capitalización y volumen.
2. La lista se actualiza automáticamente cada 60 segundos.
3. Se pueden ordenar por: capitalización, precio, cambio 24h, volumen, nombre.
4. Se puede buscar criptomonedas por nombre o símbolo.
5. Se pueden filtrar por categoría: DeFi, NFT, Stablecoins, Layer 1, Layer 2, etc.
6. Se muestra el indicador de tendencia (alcista/bajista) con colores verde/rojo.
7. Los precios se muestran en la moneda base del usuario (USD, COP, EUR).
8. Se muestra un resumen del mercado: total market cap, volumen 24h, dominancia BTC.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/market/crypto` | Lista top criptomonedas |
| GET | `/api/market/crypto/:id` | Detalle de una criptomoneda |
| GET | `/api/market/overview` | Resumen del mercado |

---

## Query Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| page | number | Página (default: 1) |
| perPage | number | Elementos por página (default: 50, max: 250) |
| order | string | Orden: market_cap, volume, price, change |
| direction | string | asc/desc |
| category | string | Categoría de filtro |
| search | string | Búsqueda por nombre/símbolo |
| currency | string | Moneda base (default: usd) |

---

## Response

```json
{
  "success": true,
  "data": {
    "coins": [
      {
        "id": "bitcoin",
        "symbol": "BTC",
        "name": "Bitcoin",
        "image": "https://assets.coingecko.com/...",
        "currentPrice": 68432.50,
        "change24h": 2.34,
        "marketCap": 1345000000000,
        "volume24h": 28500000000,
        "high24h": 69200.00,
        "low24h": 67100.00,
        "sparkline": [68000, 68200, 67900, 68432]
      }
    ],
    "marketOverview": {
      "totalMarketCap": 2670000000000,
      "totalVolume24h": 98500000000,
      "btcDominance": 50.4,
      "activeCryptocurrencies": 12847
    }
  }
}
```

---

## Reglas de Negocio

- Los datos se obtienen de CoinGecko API (free tier: 30 calls/min).
- Se implementa cache de 60 segundos para reducir llamadas API.
- En caso de fallo de la API, se usan datos de fallback del último fetch.
- Los precios se muestran con el número apropiado de decimales según el valor.
- Los sparklines contienen datos de las últimas 24 horas (48 puntos).

---

## Dependencias

- CoinGecko API (https://api.coingecko.com/api/v3).
- Tabla `assets` para catálogo de activos.
- Tabla `market_prices` para datos históricos.
- Cache Redis para datos de mercado.

---

## Referencias

- CoinGecko API Documentation v3.
- CMC (CoinMarketCap) API como alternativa.
