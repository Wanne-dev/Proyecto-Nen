import { marketFeed, marketNumber, publicJson, record } from "./market-feed";

const ASSETS = {
  BTC: { pair: "XBTUSD", key: "XXBTZUSD" },
  ETH: { pair: "ETHUSD", key: "XETHZUSD" },
  USDC: { pair: "USDCUSD", key: "USDCUSD" },
} as const;
const RANGES = {
  "24h": { interval: 15, hours: 24 }, "7d": { interval: 60, hours: 168 }, "30d": { interval: 240, hours: 720 },
} as const;
export type MarketAsset = keyof typeof ASSETS;
export type MarketRange = keyof typeof RANGES;
export type SpotQuote = { price: number; changeDayPct: number; high24h: number; low24h: number; volume24h: number };
export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
export type BookLevel = { price: number; quantity: number };
export type OrderBook = { bids: BookLevel[]; asks: BookLevel[] };

export function isMarketAsset(value: unknown): value is MarketAsset {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(ASSETS, value);
}
export function isMarketRange(value: unknown): value is MarketRange {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(RANGES, value);
}
const pair = (asset: MarketAsset) => ASSETS[asset].pair;
const positive = (value: unknown) => {
  const number = marketNumber(value);
  return number !== null && number >= 0.00000001 && number <= 1_000_000_000 ? number : null;
};
const tuple = (value: unknown, index: number): unknown => Array.isArray(value) ? value[index] : undefined;

async function kraken(resource: "Ticker" | "OHLC" | "Depth", query: Record<string, string>) {
  const response = await publicJson(`https://api.kraken.com/0/public/${resource}?${new URLSearchParams(query)}`);
  const body = record(response?.data);
  if (!response || !body || !Array.isArray(body.error) || body.error.length !== 0) return null;
  const result = record(body.result);
  return result ? { at: response.at, result } : null;
}

const quotes = marketFeed("Kraken", 30_000, 60_000, 15 * 60_000, async (_: "usd") => {
  const response = await kraken("Ticker", { pair: Object.values(ASSETS).map(({ pair }) => pair).join(",") });
  if (!response) return null;
  const data: Partial<Record<MarketAsset, SpotQuote>> = {};
  for (const asset of Object.keys(ASSETS) as MarketAsset[]) {
    const row = record(response.result[ASSETS[asset].key]);
    if (!row) continue;
    const price = positive(tuple(row.c, 0));
    const open = positive(row.o); // Apertura del día UTC, no de la ventana móvil de 24 h.
    const high24h = positive(tuple(row.h, 1));
    const low24h = positive(tuple(row.l, 1));
    const volume24h = marketNumber(tuple(row.v, 1));
    if (price === null || open === null || high24h === null || low24h === null ||
      high24h < low24h || volume24h === null || volume24h < 0) continue;
    data[asset] = { price, changeDayPct: (price / open - 1) * 100, high24h, low24h, volume24h };
  }
  return Object.keys(data).length ? { at: response.at, data } : null;
});
export const getSpotQuotes = () => quotes("usd");

type ChartKey = `${MarketAsset}:${MarketRange}`;
const candles = marketFeed("Kraken", 60_000, 3 * 60_000, 60 * 60_000, async (key: ChartKey) => {
  const [asset, range] = key.split(":") as [MarketAsset, MarketRange];
  const { interval, hours } = RANGES[range];
  const response = await kraken("OHLC", { pair: pair(asset), interval: String(interval) });
  if (!response) return null;
  const raw = response.result[ASSETS[asset].key];
  if (!Array.isArray(raw)) return null;
  const now = Math.floor(response.at / 1000);
  const earliest = now - hours * 3600;
  const unique = new Map<number, Candle>();
  for (const row of raw as unknown[]) {
    if (!Array.isArray(row)) continue;
    const [time, open, high, low, close, volume] = [marketNumber(row[0]), positive(row[1]), positive(row[2]),
      positive(row[3]), positive(row[4]), marketNumber(row[6])];
    if (time === null || !Number.isInteger(time) || time < earliest || time > now + 1 || open === null || high === null ||
      low === null || close === null || volume === null || volume < 0 || high < Math.max(open, close) || low > Math.min(open, close)) continue;
    unique.set(time, { time, open, high, low, close, volume });
  }
  const points = [...unique.values()].sort((a, b) => a.time - b.time);
  // No inventar la vela actual ni extender una serie atrasada hasta hoy.
  const latest = points.at(-1);
  if (!latest || points.length < 2 || now - latest.time >= 2 * interval * 60) return null;
  return { at: response.at, data: { intervalMinutes: interval, points } };
});
export const getSpotCandles = (asset: MarketAsset, range: MarketRange) => candles(`${asset}:${range}`);

function levels(value: unknown, side: "asks" | "bids"): BookLevel[] {
  if (!Array.isArray(value)) return [];
  const sorted = (value as unknown[]).flatMap((row) => {
    const price = positive(tuple(row, 0));
    const quantity = marketNumber(tuple(row, 1));
    return price !== null && quantity !== null && quantity > 0 ? [{ price, quantity }] : [];
  });
  return sorted.sort((a, b) => side === "asks" ? a.price - b.price : b.price - a.price).slice(0, 6);
}

export const getSpotBook = marketFeed("Kraken", 30_000, 60_000, 5 * 60_000, async (asset: MarketAsset) => {
  const response = await kraken("Depth", { pair: pair(asset), count: "6" });
  const row = record(response?.result[ASSETS[asset].key]);
  if (!response || !row) return null;
  const asks = levels(row.asks, "asks");
  const bids = levels(row.bids, "bids");
  return asks.length && bids.length ? { at: response.at, data: { asks, bids } satisfies OrderBook } : null;
});
