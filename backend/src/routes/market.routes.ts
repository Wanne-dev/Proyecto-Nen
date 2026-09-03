/* ===== PROXY COINGECKO - Backend cache + rate limit protection ===== */
/* Ruta: /v1/market/markets, /v1/market/ohlc/:coinId, /v1/market/coin/:coinId
   Estrategia "stale-while-revalidate":
   - Sirve datos frescos si están dentro del TTL.
   - Si CoinGecko falla (429 rate limit, red, etc.) SIEMPRE sirve la última
     copia guardada (aunque esté "vencida") en lugar de devolver error.
   - Solo si nunca hubo datos devuelve una respuesta vacía (200) para que el
     frontend muestre sus datos de demostración. La app NUNCA se queda a medias. */
import { Router, Request, Response } from "express";

const router = Router();
const CG_BASE = "https://api.coingecko.com/api/v3";

/* ----- Sistema de cache en memoria (nunca se borra para servir de respaldo) ----- */
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

/* TTLs por tipo de dato (fresco). Después de esto se revalida, pero el dato
   sigue disponible como respaldo ante fallos. */
const TTL = {
  markets: 2 * 60 * 1000,   // 2 min
  ohlc: 10 * 60 * 1000,     // 10 min (velas históricas cambian lento)
  coin: 5 * 60 * 1000,      // 5 min
};

function getFresh(key: string, ttl: number): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) return null; // vencido → revalidar
  return entry.data;
}

/* Sirve la última copia guardada sin importar la antigüedad */
function getStale(key: string): any | null {
  const entry = cache.get(key);
  return entry ? entry.data : null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/* ----- Helper: fetch a CoinGecko con reintentos ----- */
async function fetchCG(url: string, retries = 2): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "NEN-Bank/1.0",
        },
      });

      if (res.status === 429) {
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        return { error: true, status: 429, message: "CoinGecko rate limit" };
      }

      if (!res.ok) {
        const text = await res.text();
        return { error: true, status: res.status, message: text || `CoinGecko error ${res.status}` };
      }

      const data = await res.json();

      /* Verificar que no sea "Throttled" u otros formatos no-array */
      if (typeof data === "string") {
        return { error: true, status: 429, message: "CoinGecko throttled" };
      }

      return data;
    } catch (err: any) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      return { error: true, status: 500, message: err.message || "Error de conexion con CoinGecko" };
    }
  }
  return { error: true, status: 500, message: "Sin respuesta de CoinGecko" };
}

/* ----- Respuesta de respaldo: nunca error, siempre algo útil ----- */
function serveFallback(res: Response, key: string, emptyShape: any, type: "markets" | "ohlc" | "coin") {
  const stale = getStale(key);
  if (stale !== null) {
    res.setHeader("x-cache", "stale");
    res.json(stale);
    return;
  }
  res.setHeader("x-cache", "empty");
  res.json(emptyShape);
}

/* ===== GET /markets - Top criptomonedas ===== */
router.get("/markets", async (req: Request, res: Response) => {
  try {
    const vs = req.query.vs_currency as string || "usd";
    const order = req.query.order as string || "market_cap_desc";
    const perPage = req.query.per_page as string || "30";
    const page = req.query.page as string || "1";
    const sparkline = req.query.sparkline as string || "false";
    const pct = req.query.price_change_percentage as string || "24h,7d";

    const cacheKey = `markets:${vs}:${order}:${perPage}:${page}`;
    const fresh = getFresh(cacheKey, TTL.markets);
    if (fresh) {
      res.setHeader("x-cache", "fresh");
      res.json(fresh);
      return;
    }

    const url = `${CG_BASE}/coins/markets?vs_currency=${vs}&order=${order}&per_page=${perPage}&page=${page}&sparkline=${sparkline}&price_change_percentage=${pct}`;
    const data = await fetchCG(url);

    if (data.error) {
      serveFallback(res, cacheKey, [], "markets");
      return;
    }

    const result = Array.isArray(data) ? data : [];
    setCache(cacheKey, result);
    res.setHeader("x-cache", "fresh");
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error interno" });
  }
});

/* ===== GET /ohlc/:coinId - Velas japonesas ===== */
router.get("/ohlc/:coinId", async (req: Request, res: Response) => {
  try {
    const { coinId } = req.params;
    const vs = req.query.vs_currency as string || "usd";
    const days = req.query.days as string || "1";

    const cacheKey = `ohlc:${coinId}:${vs}:${days}`;
    const fresh = getFresh(cacheKey, TTL.ohlc);
    if (fresh) {
      res.setHeader("x-cache", "fresh");
      res.json(fresh);
      return;
    }

    const url = `${CG_BASE}/coins/${coinId}/ohlc?vs_currency=${vs}&days=${days}`;
    const data = await fetchCG(url);

    if (data.error) {
      serveFallback(res, cacheKey, [], "ohlc");
      return;
    }

    const result = Array.isArray(data) ? data : [];
    setCache(cacheKey, result);
    res.setHeader("x-cache", "fresh");
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error interno" });
  }
});

/* ===== GET /coin/:coinId - Detalle de moneda ===== */
router.get("/coin/:coinId", async (req: Request, res: Response) => {
  try {
    const { coinId } = req.params;

    const cacheKey = `coin:${coinId}`;
    const fresh = getFresh(cacheKey, TTL.coin);
    if (fresh) {
      res.setHeader("x-cache", "fresh");
      res.json(fresh);
      return;
    }

    const url = `${CG_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`;
    const data = await fetchCG(url);

    if (data.error) {
      serveFallback(res, cacheKey, { id: coinId }, "coin");
      return;
    }

    setCache(cacheKey, data);
    res.setHeader("x-cache", "fresh");
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error interno" });
  }
});

export default router;