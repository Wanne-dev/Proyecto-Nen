# RF-013: Gráficas de Precios en Tiempo Real

**ID:** RF-013  
**Nombre:** Gráficas de Precios en Tiempo Real  
**Prioridad:** Alta  
**Categoría:** Trading / Mercado  

---

## Descripción

El sistema permite al usuario visualizar gráficas de precios de criptomonedas en tiempo real con múltiples timeframes, indicadores técnicos y datos OHLCV (Open, High, Low, Close, Volume), facilitando el análisis técnico para la toma de decisiones de trading.

---

## Criterios de Aceptación

1. El usuario puede seleccionar una criptomoneda para ver su gráfica de precios.
2. Se soportan los siguientes timeframes: 1m, 5m, 15m, 1h, 4h, 1d, 1w, 1M.
3. La gráfica se actualiza en tiempo real según el timeframe seleccionado.
4. Se muestran datos OHLCV (velas japonesas) para timeframes de 1h o mayores.
5. Se muestra el volumen de negociación en un panel inferior de la gráfica.
6. Se pueden agregar indicadores técnicos: SMA, EMA, RSI, MACD, Bollinger Bands.
7. Se pueden agregar líneas de tendencia y niveles de soporte/resistencia manuales.
8. Se muestra el precio actual, cambio 24h, máximo y mínimo del período.
9. La gráfica soporta zoom y scroll para navegar datos históricos.

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/market/crypto/:id/chart` | Datos de gráfica OHLCV |

---

## Query Parameters

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| timeframe | string | 1m, 5m, 15m, 1h, 4h, 1d, 1w, 1M |
| from | date | Fecha inicio |
| to | date | Fecha fin |
| indicators | string | Indicadores separados por coma: sma, ema, rsi, macd, bb |

---

## Response

```json
{
  "success": true,
  "data": {
    "coinId": "bitcoin",
    "symbol": "BTC",
    "timeframe": "1h",
    "currentPrice": 68432.50,
    "change24h": 2.34,
    "high24h": 69200.00,
    "low24h": 67100.00,
    "candles": [
      {
        "timestamp": 1705312800000,
        "open": 68000.00,
        "high": 68500.00,
        "low": 67800.00,
        "close": 68432.50,
        "volume": 1234567.89
      }
    ],
    "indicators": {
      "sma20": 67800.00,
      "sma50": 67200.00,
      "ema12": 67900.00,
      "rsi": 62.5,
      "macd": {
        "macd": 450.00,
        "signal": 380.00,
        "histogram": 70.00
      }
    }
  }
}
```

---

## Reglas de Negocio

- Datos de gráfica se obtienen de CoinGecko y se almacenan en `market_prices`.
- Timeframes menores a 1h se actualizan cada minuto.
- Timeframes de 1h o mayores se actualizan cada 5 minutos.
- Se almacenan datos OHLCV para todos los timeframes en la tabla `market_prices`.
- Los indicadores técnicos se calculan del lado del servidor.
- Máximo 500 velas por solicitud.

---

## Dependencias

- CoinGecko API para datos OHLCV.
- Tabla `market_prices` con campos OHLCV y timeframe.
- Librería de gráficas en frontend (Lightweight Charts o TradingView).
- Cache Redis para datos de gráfica.

---

## Referencias

- CoinGecko OHLCV API.
- TradingView Lightweight Charts Library.
- Technical Analysis Library (TA-Lib).
