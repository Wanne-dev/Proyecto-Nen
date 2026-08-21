/* ============================================================
   SERVICIO DE MERCADO — BANCA NEN (proxy CoinGecko del backend)
   ============================================================ */
import api, { unwrap } from "../api/client";

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
  color?: string;
}

export interface OHLCPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export const marketService = {
  async getTopCryptos(limit = 30): Promise<MarketCoin[]> {
    const res = await api.get("/market/markets", {
      params: {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: limit,
        page: 1,
        sparkline: "false",
        price_change_percentage: "24h,7d",
      },
    });
    return (res.data || []) as MarketCoin[];
  },

  async getOHLC(coinId: string, days: number): Promise<OHLCPoint[]> {
    const res = await api.get(`/market/ohlc/${coinId}`, { params: { vs_currency: "usd", days } });
    const raw: number[][] = res.data || [];
    if (!Array.isArray(raw)) return [];
    return raw.map(([ts, o, h, l, c]) => ({
      time: Math.floor(ts / 1000),
      open: o, high: h, low: l, close: c,
    }));
  },

  async getCoinDetail(coinId: string): Promise<any> {
    const res = await api.get(`/market/coin/${coinId}`);
    return res.data;
  },
};

export function getTimeframeDays(tf: string): number {
  const map: Record<string, number> = {
    "1M": 1, "5M": 1, "15M": 1, "1H": 1, "4H": 7, "1D": 30, "1W": 90, "1MO": 365,
  };
  return map[tf] || 1;
}
