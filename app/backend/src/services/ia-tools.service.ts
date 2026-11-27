import { UserRole } from "../models/User";
import { Currency } from "../models/WalletBalance";
import { getAdminOverview } from "./ia-portfolio.service";
import { getSpotQuotes, type MarketAsset } from "./kraken-market";
import { marketNumber, publicJson, record } from "./market-feed";
import { getVirtualQuote, isVirtualTradeAsset } from "./virtual-quotes";

/** Solo símbolos acotados: el modelo no puede convertir un tool call en una URL arbitraria. */
const SYMBOL = /^[A-Z0-9]{2,12}$/;
const CRYPTO = ["BTC", "ETH", "USDC"] as const;
const FIAT: Record<string, Currency> = { USD: Currency.USD, COP: Currency.COP, EUR: Currency.EUR };

export const IA_TOOLS = [
  {
    type: "function",
    function: {
      name: "getMarketPrice",
      description: "Devuelve el precio actual en USD de una criptodivisa (BTC, ETH, USDC) o la referencia en USD de una divisa (USD, COP, EUR). Úsalo para precios y cotizaciones recientes.",
      parameters: {
        type: "object",
        properties: { symbol: { type: "string", description: "Símbolo del activo, por ejemplo BTC, ETH, USDC, COP o EUR." } },
        required: ["symbol"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchFinancialNews",
      description: "Devuelve hasta cinco titulares recientes de Google News sobre mercados, finanzas o el activo consultado. Úsalo para noticias y tendencias del mercado.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Tema a buscar, por ejemplo 'bitcoin precio' o 'mercados financieros'." } },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
] as const;

const ADMIN_TOOL = {
  type: "function",
  function: {
    name: "getAdminOverview",
    description: "Solo administradores: devuelve el reporte agregado de la plataforma (total de usuarios por rol y estado, billeteras activas, saldo virtual total y movimientos de los últimos 30 días). Úsalo siempre que pregunten por usuarios, registros, reportes, métricas o actividad de la plataforma. No devuelve datos personales.",
    parameters: { type: "object", properties: {}, additionalProperties: false },
  },
} as const;

export const IA_ADMIN_TOOLS = [...IA_TOOLS, ADMIN_TOOL] as const;
export type IaToolName = (typeof IA_ADMIN_TOOLS)[number]["function"]["name"];

export function toolsForRole(role: UserRole) {
  return role === UserRole.ADMIN ? IA_ADMIN_TOOLS : IA_TOOLS;
}

function isIaToolName(value: string): value is IaToolName {
  return IA_ADMIN_TOOLS.some((tool) => tool.function.name === value);
}

function argsObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}

async function cryptoPrice(symbol: string) {
  const response = await publicJson(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`);
  const row = record(response?.data);
  if (!response || !row) return null;
  const price = marketNumber(row.lastPrice);
  if (price === null || price <= 0) return null;
  return {
    symbol,
    priceUsd: price,
    change24hPct: marketNumber(row.priceChangePercent),
    high24h: marketNumber(row.highPrice),
    low24h: marketNumber(row.lowPrice),
    source: "Binance",
    asOf: new Date(response.at).toISOString(),
  };
}

async function fallbackCryptoPrice(symbol: string) {
  if (!isVirtualTradeAsset(symbol)) return null;
  const snapshot = await getSpotQuotes();
  if (snapshot.status !== "fresh") return null;
  const quote = snapshot.data[symbol as MarketAsset];
  if (!quote) return null;
  return {
    symbol,
    priceUsd: quote.price,
    change24hPct: quote.changeDayPct,
    high24h: quote.high24h,
    low24h: quote.low24h,
    source: "Kraken",
    asOf: snapshot.asOf,
  };
}

export async function getMarketPrice(rawArgs: unknown) {
  const args = argsObject(rawArgs);
  const requested = typeof args?.symbol === "string" ? args.symbol.trim().toUpperCase().replace(/\/(USD|USDT)$/, "") : "";
  if (!SYMBOL.test(requested)) return { error: "Símbolo no admitido. Usa BTC, ETH, USDC, USD, COP o EUR." };
  const symbol = requested.endsWith("USDT") ? requested.slice(0, -4) : requested;
  if (!SYMBOL.test(symbol)) return { error: "Símbolo no admitido." };

  const fiat = FIAT[symbol];
  if (fiat) {
    try {
      const quote = await getVirtualQuote(fiat);
      return { symbol, priceUsd: Number(quote.usd), source: quote.source, asOf: quote.asOf.toISOString() };
    } catch {
      return { symbol, error: "No hay una referencia actualizada para esta divisa.", source: "Frankfurter" };
    }
  }

  if (!CRYPTO.includes(symbol as (typeof CRYPTO)[number])) {
    return { error: "Símbolo no admitido. Usa BTC, ETH, USDC, USD, COP o EUR." };
  }
  try {
    const quote = await cryptoPrice(symbol);
    if (quote) return quote;
  } catch {
    // Binance puede no estar disponible en todas las regiones; se usa la fuente ya integrada.
  }
  try {
    const quote = await fallbackCryptoPrice(symbol);
    if (quote) return quote;
  } catch {
    // Se informa la ausencia de datos sin inventar precios.
  }
  return { symbol, error: "No hay una cotización actualizada en este momento." };
}

export async function searchFinancialNews(rawArgs: unknown) {
  const args = argsObject(rawArgs);
  const query = typeof args?.query === "string"
    ? args.query.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120)
    : "";
  if (!query) return { error: "La búsqueda de noticias necesita un tema." };

  try {
    const search = `${query} trading finance`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(search)}&hl=es-419&gl=ES&ceid=ES:es`;
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
      headers: { Accept: "application/rss+xml, application/xml", "User-Agent": "BANCA-NEN/1.0" },
    });
    if (!response.ok) return { query, error: "No se pudieron obtener noticias en este momento.", source: "Google News RSS" };
    const xml = (await response.text()).slice(0, 500_000);
    const items: Array<{ title: string; publishedAt: string | null }> = [];
    for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
      const block = match[1];
      const title = decodeXml(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
      if (!title) continue;
      const published = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "";
      const parsed = Date.parse(decodeXml(published));
      items.push({ title: title.slice(0, 240), publishedAt: Number.isFinite(parsed) ? new Date(parsed).toISOString() : null });
      if (items.length === 5) break;
    }
    return { query, source: "Google News RSS", items };
  } catch {
    return { query, error: "No se pudieron obtener noticias en este momento.", source: "Google News RSS" };
  }
}

export async function executeIaTool(name: string, rawArgs: unknown, role: UserRole = UserRole.USER): Promise<unknown> {
  if (!isIaToolName(name)) return { error: "Herramienta no disponible." };
  if (name === "getAdminOverview" && role !== UserRole.ADMIN) {
    return { error: "Esta consulta requiere perfil de administrador." };
  }
  const args = argsObject(rawArgs);
  if (name === "getMarketPrice") return getMarketPrice(args);
  if (name === "searchFinancialNews") return searchFinancialNews(args);
  return getAdminOverview();
}
