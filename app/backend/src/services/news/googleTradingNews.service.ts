/**
 * Portal de noticias financieras con Google News RSS público (sin API keys).
 * Toda búsqueda se condiciona a trading/mercados antes de consultar el feed.
 */
import { AppError } from "../../middleware/errorHandler.middleware";

export type NewsCategory = "all" | "crypto" | "forex" | "stocks" | "macro";

export interface TradingNewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet: string;
  image: string;
}

export interface TradingNewsFeed {
  query: string;
  category: NewsCategory;
  source: "Google News RSS";
  items: TradingNewsItem[];
  cached: boolean;
}

export const NEWS_CATEGORIES: readonly NewsCategory[] = ["all", "crypto", "forex", "stocks", "macro"];

const BASE_QUERY: Record<NewsCategory, string> = {
  all: "mercados financieros OR trading OR bitcoin OR forex",
  crypto: "criptomonedas OR bitcoin OR ethereum trading",
  forex: "divisas forex OR dolar OR reserva federal",
  stocks: "bolsa de valores OR wall street OR sp500",
  macro: "inflacion OR tasas de interes OR economia global",
};

const CONTEXT = "(trading OR mercado OR bolsa OR cripto OR forex OR economia OR inversion)";
const CACHE_TTL = 5 * 60_000;
const cache = new Map<string, { at: number; value: TradingNewsFeed }>();

export function newsCategory(value: unknown): NewsCategory | null {
  return typeof value === "string" && NEWS_CATEGORIES.includes(value as NewsCategory)
    ? value as NewsCategory
    : null;
}

/** Consulta siempre acotada al ámbito financiero, incluso si el usuario escribe un tema general. */
export function conditionNewsQuery(query?: string, category: NewsCategory = "all"): string {
  const clean = (query ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  if (clean) return `(${clean}) AND ${CONTEXT}`;
  return BASE_QUERY[newsCategory(category) ?? "all"];
}

function decode(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&");
}

function textOf(raw: string): string {
  return decode(decode(raw))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(xml: string, name: string): string {
  return xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] ?? "";
}

/** Imagen institucional del medio (favicon público), sin claves ni servicios de pago. */
function sourceImage(url: string): string {
  let host = "news.google.com";
  try {
    host = new URL(url).hostname;
  } catch {
    // Sin URL de origen: se usa el dominio del propio feed.
  }
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
}

function hashId(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function parseItems(xml: string): TradingNewsItem[] {
  const items: TradingNewsItem[] = [];
  for (const [, block] of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const title = textOf(tag(block, "title"));
    const link = textOf(tag(block, "link"));
    if (!title || !/^https?:\/\//i.test(link)) continue;

    const sourceTag = block.match(/<source(?:\s[^>]*)?url=["']([^"']+)["'][^>]*>([\s\S]*?)<\/source>/i);
    const source = textOf(sourceTag?.[2] ?? tag(block, "source")) || "Google News";
    const rawDate = textOf(tag(block, "pubDate"));
    const time = Date.parse(rawDate);
    const snippet = textOf(tag(block, "description"));

    items.push({
      id: hashId(textOf(tag(block, "guid")) || link),
      title,
      link,
      pubDate: Number.isFinite(time) ? new Date(time).toISOString() : rawDate,
      source,
      snippet,
      image: sourceImage(sourceTag?.[1] ?? link),
    });
    if (items.length === 12) break;
  }
  return items;
}

export async function fetchTradingNews(query?: string, category: NewsCategory = "all"): Promise<TradingNewsFeed> {
  const safeCategory = newsCategory(category) ?? "all";
  const conditioned = conditionNewsQuery(query, safeCategory);
  const key = `${safeCategory}|${conditioned}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return { ...hit.value, cached: true };

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(conditioned)}&hl=es-419&gl=CO&ceid=CO:es-419`;
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  } catch {
    throw new AppError("No se pudo conectar con el feed de noticias. Intenta de nuevo.", 502);
  }
  if (!response.ok) throw new AppError("El feed de noticias no está disponible en este momento.", 502);

  const xml = await response.text();
  const value: TradingNewsFeed = {
    query: conditioned,
    category: safeCategory,
    source: "Google News RSS",
    items: parseItems(xml),
    cached: false,
  };
  if (cache.size >= 60) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}
