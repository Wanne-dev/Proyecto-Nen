/* ===== SERVICIO DE MERCADO - Usa backend proxy (no CoinGecko directo) ===== */
/* Todas las peticiones van a /api/v1/market/... que Vite proxyea al backend */
/* El backend hace fetch a CoinGecko con cache + proteccion de rate limit */

const BASE = "/api/v1/market";

export interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d_in_currency?: number;
  high_24h: number;
  low_24h: number;
  market_cap_rank: number;
}

export interface OHLCPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/* Top criptomonedas por capitalizacion - via backend proxy */
export async function getTopCryptos(limit = 20): Promise<MarketCoin[]> {
  const res = await fetch(
    `${BASE}/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h,7d`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Mercado error: ${res.status}`);
  }
  const data = await res.json();
  /* Defensa: siempre devolver array */
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

/* Datos OHLC para grafico de velas - via backend proxy */
export async function getOHLC(coinId: string, days: number): Promise<OHLCPoint[]> {
  const res = await fetch(
    `${BASE}/ohlc/${coinId}?vs_currency=usd&days=${days}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `OHLC error: ${res.status}`);
  }
  const raw: number[][] = await res.json();
  if (!Array.isArray(raw)) return [];
  return raw.map(([ts, o, h, l, c]) => ({
    time: Math.floor(ts / 1000),
    open: o,
    high: h,
    low: l,
    close: c,
  }));
}

/* Detalle de una moneda - via backend proxy */
export async function getCoinDetail(coinId: string) {
  const res = await fetch(
    `${BASE}/coin/${coinId}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Detalle error: ${res.status}`);
  }
  return res.json();
}

/* Mapea timeframe a dias para la API */
export function getTimeframeDays(tf: string): number {
  const map: Record<string, number> = {
    "1M": 1,
    "5M": 1,
    "15M": 1,
    "1H": 1,
    "4H": 7,
    "1D": 30,
    "1W": 90,
    "1MO": 365,
  };
  return map[tf] || 1;
}