import { AppError } from "../middleware/errorHandler.middleware";
import { Currency } from "../models/WalletBalance";
import { getSpotQuotes, isMarketAsset } from "./kraken-market";
import { marketFeed, marketNumber, publicJson, record } from "./market-feed";

type Fiat = Currency.COP | Currency.EUR;
export type VirtualQuote<Source extends string = "usd" | "kraken" | "frankfurter"> = { usd: string; source: Source; asOf: Date };

export const VIRTUAL_TRADE_ASSETS = [Currency.BTC, Currency.ETH, Currency.USDC] as const;
type TradeAsset = (typeof VIRTUAL_TRADE_ASSETS)[number];
export const isVirtualTradeAsset = (currency: string): currency is TradeAsset => isMarketAsset(currency);

const fiat = marketFeed("Frankfurter", 60 * 60_000, 7 * 86_400_000, 7 * 86_400_000, async (currency: Fiat) => {
  const response = await publicJson(`https://api.frankfurter.dev/v2/rate/${currency}/USD`);
  const row = record(response?.data);
  if (!response || row?.base !== currency || row.quote !== "USD" || typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return null;
  const price = marketNumber(row.rate);
  const at = Date.parse(`${row.date}T00:00:00Z`);
  return price !== null && price >= 0.00000001 && price <= 1_000_000_000 ? { at, data: price } : null;
});

const missing = (currency: Currency) => new AppError(`No hay una cotización actualizada para ${currency}. No se registró la operación.`, 503);

export async function getVirtualTradeQuote(currency: TradeAsset): Promise<VirtualQuote<"kraken">> {
  const snapshot = await getSpotQuotes();
  if (snapshot.status === "fresh") {
    const quote = snapshot.data[currency];
    if (quote) return { usd: quote.price.toFixed(8), source: "kraken", asOf: new Date(snapshot.asOf) };
  }
  throw missing(currency);
}

/** El saldo es ficticio. Excepto USD→USD, solo se contabiliza con una referencia real y vigente. */
export async function getVirtualQuote(currency: Currency): Promise<VirtualQuote> {
  if (currency === Currency.USD) return { usd: "1", source: "usd", asOf: new Date() };
  if (isVirtualTradeAsset(currency)) return getVirtualTradeQuote(currency);
  if (currency !== Currency.COP && currency !== Currency.EUR) throw new AppError("Moneda no admitida para esta operación", 400);
  const snapshot = await fiat(currency);
  if (snapshot.status !== "fresh") throw missing(currency);
  return { usd: snapshot.data.toFixed(8), source: "frankfurter", asOf: new Date(snapshot.asOf) };
}
