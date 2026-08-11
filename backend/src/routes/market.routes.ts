/* ===== PROXY COINGECKO - Backend cache + rate limit protection ===== */
/* Ruta: /v1/market/markets, /v1/market/ohlc/:coinId, /v1/market/coin/:coinId */
import { Router, Request, Response } from "express";

const router = Router();
const CG_BASE = "https://api.coingecko.com/api/v3";

/* ----- Sistema de cache en memoria ----- */
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 1000;

function getCache(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
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
        return { error: true, status: 429, message: "CoinGecko rate limit. Intenta en 60 segundos." };
      }

      if (!res.ok) {
        const text = await res.text();
        return { error: true, status: res.status, message: text || `CoinGecko error ${res.status}` };
      }

      const data = await res.json();

      /* Verificar que no sea "Throttled" u otros formatos no-array */
      if (typeof data === "string") {
        return { error: true, status: 429, message: "CoinGecko throttled. Intenta en 60 segundos." };
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
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const url = `${CG_BASE}/coins/markets?vs_currency=${vs}&order=${order}&per_page=${perPage}&page=${page}&sparkline=${sparkline}&price_change_percentage=${pct}`;
    const data = await fetchCG(url);

    if (data.error) {
      res.status(data.status).json({ error: data.message });
      return;
    }

    /* Asegurar que siempre sea array */
    const result = Array.isArray(data) ? data : [];
    setCache(cacheKey, result);
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
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const url = `${CG_BASE}/coins/${coinId}/ohlc?vs_currency=${vs}&days=${days}`;
    const data = await fetchCG(url);

    if (data.error) {
      res.status(data.status).json({ error: data.message });
      return;
    }

    const result = Array.isArray(data) ? data : [];
    setCache(cacheKey, result);
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
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const url = `${CG_BASE}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`;
    const data = await fetchCG(url);

    if (data.error) {
      res.status(data.status).json({ error: data.message });
      return;
    }

    setCache(cacheKey, data);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error interno" });
  }
});

export default router;