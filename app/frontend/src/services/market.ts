import api from "../api/client";

export const MARKET_ASSETS = ["BTC", "ETH", "USDC"] as const;
export const MARKET_RANGES = ["24h", "7d", "30d"] as const;
export type MarketAsset = (typeof MARKET_ASSETS)[number];
export type MarketRange = (typeof MARKET_RANGES)[number];
export type SpotQuote = { price: number; changeDayPct: number; high24h: number; low24h: number; volume24h: number };
export type Quotes = Partial<Record<MarketAsset, SpotQuote>>;
export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
export type Candles = { intervalMinutes: number; points: Candle[] };
export type BookLevel = { price: number; quantity: number };
export type Book = { bids: BookLevel[]; asks: BookLevel[] };
export type MarketSnapshot<T> =
  | { status: "fresh" | "stale"; source: string; asOf: string; data: T }
  | { status: "offline" | "unavailable"; source: string; asOf: null; data: null };

async function get<T>(url: string, signal: AbortSignal): Promise<MarketSnapshot<T>> {
  return (await api.get<MarketSnapshot<T>>(url, { signal, timeout: 8000 })).data;
}
export const getQuotes = (signal: AbortSignal) => get<Quotes>("/market/quotes", signal);
export const getCandles = (symbol: MarketAsset, range: MarketRange, signal: AbortSignal) => get<Candles>(`/market/candles/${symbol}?range=${range}`, signal);
export const getBook = (symbol: MarketAsset, signal: AbortSignal) => get<Book>(`/market/book/${symbol}`, signal);

const usd2 = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd4 = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const percent = new Intl.NumberFormat("es-CO", { signDisplay: "exceptZero", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const stamp = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
export const formatUsd = (amount: number) => usd2.format(amount);
export const formatQuote = (price: number, symbol: MarketAsset) => (symbol === "USDC" ? usd4 : usd2).format(price);
export const formatDelta = (delta: number) => `${percent.format(delta)} %`;
export const formatObservation = (asOf: string) => stamp.format(new Date(asOf));
