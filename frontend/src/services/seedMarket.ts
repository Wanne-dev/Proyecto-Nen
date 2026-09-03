/* ============================================================
   DATOS DE DEMOSTRACIÓN INSTANTÁNEOS — BANCA NEN
   Genera velas y una lista de activos plausibles al momento,
   para que el gráfico y la watchlist NUNCA queden vacíos
   (ni cuando CoinGecko falla o está en rate limit).
   ============================================================ */
import type { MarketCoin, OHLCPoint } from "./coingecko";

export type TF = "1M" | "5M" | "15M" | "1H" | "4H" | "1D" | "1W" | "1MO";
export const TFS: TF[] = ["1M", "5M", "15M", "1H", "4H", "1D", "1W", "1MO"];

export const TF_STEP: Record<TF, number> = {
  "1M": 60, "5M": 300, "15M": 900, "1H": 3600, "4H": 14400,
  "1D": 86400, "1W": 604800, "1MO": 2592000,
};

/* PRNG determinista (misma entrada -> misma serie) */
export function seeded(s: number) {
  let x = Math.floor(Math.abs(s) || 1);
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

/* Velas demo plausibles generadas AL INSTANTE mientras llega la API real */
export function generateSeedOHLC(price: number, tf: TF, bars = 240): OHLCPoint[] {
  if (!isFinite(price) || price <= 0) price = 60000;
  const step = TF_STEP[tf];
  const rnd = seeded(price * 7 + bars);
  const now = Math.floor(Date.now() / 1000);
  const end = now - (now % step);
  const closes: number[] = [price];
  let p = price;
  for (let i = 0; i < bars; i++) {
    p = p * (1 + (rnd() - 0.5) * 0.02);
    closes.push(p);
  }
  const scale = price / closes[closes.length - 1];
  const out: OHLCPoint[] = [];
  let prevClose = closes[0] * scale;
  for (let i = 0; i < bars; i++) {
    const open = prevClose;
    const close = closes[i + 1] * scale;
    const wick = Math.abs(rnd() - 0.5) * 0.006;
    const high = Math.max(open, close) * (1 + wick);
    const low = Math.min(open, close) * (1 - wick);
    out.push({ time: end - (bars - 1 - i) * step, open, high, low, close });
    prevClose = close;
  }
  return out;
}

/* Lista demo para que la watchlist tampoco quede vacía al abrir */
export const FALLBACK_COINS: MarketCoin[] = [
  { id: "bitcoin", symbol: "btc", name: "Bitcoin", image: "", current_price: 67000, market_cap: 1.32e12, total_volume: 3.1e10, price_change_percentage_24h: 1.42, price_change_percentage_7d_in_currency: 5.8, high_24h: 68400, low_24h: 65100, market_cap_rank: 1, color: "#f5a623" },
  { id: "ethereum", symbol: "eth", name: "Ethereum", image: "", current_price: 3520, market_cap: 4.2e11, total_volume: 1.8e10, price_change_percentage_24h: 0.85, price_change_percentage_7d_in_currency: 3.1, high_24h: 3610, low_24h: 3400, market_cap_rank: 2, color: "#a78bfa" },
  { id: "solana", symbol: "sol", name: "Solana", image: "", current_price: 148, market_cap: 6.8e10, total_volume: 3.4e9, price_change_percentage_24h: -1.2, price_change_percentage_7d_in_currency: 2.4, high_24h: 156, low_24h: 142, market_cap_rank: 5, color: "#22d3ee" },
  { id: "ripple", symbol: "xrp", name: "XRP", image: "", current_price: 0.62, market_cap: 3.4e10, total_volume: 1.2e9, price_change_percentage_24h: 2.1, price_change_percentage_7d_in_currency: -0.8, high_24h: 0.64, low_24h: 0.59, market_cap_rank: 6, color: "#0a84ff" },
  { id: "binancecoin", symbol: "bnb", name: "BNB", image: "", current_price: 580, market_cap: 8.6e10, total_volume: 1.5e9, price_change_percentage_24h: 0.3, price_change_percentage_7d_in_currency: 1.9, high_24h: 592, low_24h: 568, market_cap_rank: 4, color: "#f5a623" },
  { id: "cardano", symbol: "ada", name: "Cardano", image: "", current_price: 0.44, market_cap: 1.6e10, total_volume: 6e8, price_change_percentage_24h: -0.6, price_change_percentage_7d_in_currency: 4.2, high_24h: 0.46, low_24h: 0.42, market_cap_rank: 9, color: "#0a84ff" },
];