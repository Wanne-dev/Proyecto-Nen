/* ============================================================
   BANCA NEN — Cliente CoinGecko compartido (cache + reintentos)
   Usado por market, orders e ia.
   ============================================================ */
const CG_BASE = "https://api.coingecko.com/api/v3";

interface CacheEntry { data: any; timestamp: number }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 1000;

export function getCache(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

export function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function fetchCG(url: string, retries = 2): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "NEN-Bank/1.0" } });
      if (res.status === 429) {
        if (attempt < retries) { await new Promise((r) => setTimeout(r, 2000)); continue; }
        return { error: true, status: 429, message: "CoinGecko rate limit. Intenta en 60 segundos." };
      }
      if (!res.ok) return { error: true, status: res.status, message: `CoinGecko error ${res.status}` };
      const data = await res.json();
      return data;
    } catch (err: any) {
      if (attempt < retries) { await new Promise((r) => setTimeout(r, 1000)); continue; }
      return { error: true, status: 500, message: err.message || "Error de conexion con CoinGecko" };
    }
  }
  return { error: true, status: 500, message: "Sin respuesta de CoinGecko" };
}

/* Precio simple de un símbolo (ej: BTC) → { btc: { usd: 67420 } } */
export async function getPrice(symbol: string, currency = "usd"): Promise<number | null> {
  const key = `price:${symbol.toLowerCase()}`;
  const cached = getCache(key);
  if (cached !== null) return cached;
  const data = await fetchCG(`${CG_BASE}/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=${currency}`);
  if (data.error || !data[symbol.toLowerCase()]) return null;
  const price = data[symbol.toLowerCase()][currency];
  setCache(key, price);
  return price;
}
