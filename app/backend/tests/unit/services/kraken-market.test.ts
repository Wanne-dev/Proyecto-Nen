import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSpotBook, getSpotCandles, getSpotQuotes, isMarketAsset, isMarketRange } from "../../../src/services/kraken-market";
import { getVirtualQuote, getVirtualTradeQuote } from "../../../src/services/virtual-quotes";
import { Currency } from "../../../src/models/WalletBalance";

const now = Date.parse("2026-09-15T14:23:00Z");
const s = now / 1000;
const fetcher = vi.fn();
function reply(result: object, at = Date.now(), error: string[] = []) {
  return new Response(JSON.stringify({ result, error }), { headers: { Date: new Date(at).toUTCString() } });
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv("MARKET_OFFLINE", "false"); fetcher.mockReset(); vi.stubGlobal("fetch", fetcher); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("mercado de referencia en USD", () => {
  it("usa el último precio spot intacto, mapea cada par, y no ejecuta con un dato atrasado ni uno inventado", async () => {
    fetcher.mockResolvedValueOnce(reply({ XXBTZUSD: { c: ["64075.15"], o: "64000", h: ["64500", "65002.10"], l: ["63950", "63121"], v: ["8", "25.5"] },
      XETHZUSD: { c: [""], o: "3300", h: ["3300", "3300"], l: ["3000", "3000"], v: ["100", "200"] },
      USDCUSD: { c: ["0.9997"], o: "0.9996", h: ["1", "1"], l: ["0.999", "0.9989"], v: ["45", "55"] },
    }));
    const snapshot = await getSpotQuotes();
    expect(snapshot).toMatchObject({ status: "fresh", source: "Kraken", data: {
      BTC: { price: 64075.15, high24h: 65002.10, low24h: 63121, volume24h: 25.5 }, USDC: { price: 0.9997 },
    }});
    expect(snapshot.data).not.toHaveProperty("ETH");
    expect(await getVirtualTradeQuote(Currency.BTC)).toEqual({ usd: "64075.15000000", source: "kraken", asOf: new Date(now) });
    await expect(getVirtualTradeQuote(Currency.ETH)).rejects.toMatchObject({ statusCode: 503 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    vi.setSystemTime(now + 31_000);
    fetcher.mockResolvedValueOnce(reply({}, Date.now(), ["EGeneral:Temporary lockout"]));
    await expect(getVirtualTradeQuote(Currency.BTC)).rejects.toMatchObject({ statusCode: 503 });
    expect((await getSpotQuotes()).status).toBe("stale");
    vi.stubEnv("MARKET_OFFLINE", "true");
    await expect(getVirtualTradeQuote(Currency.BTC)).rejects.toMatchObject({ statusCode: 503 });
    expect(await getVirtualQuote(Currency.USD)).toMatchObject({ usd: "1", source: "usd" });
  });

  it("conserva OHLCV y tiempo original sin interpolar, y diferencia ofertas de compra y venta", async () => {
    fetcher.mockResolvedValueOnce(reply({ XETHZUSD: [
      [s - 840, "30", "34", "29", "33", "31", "1.23", 17],
      [s - 1740, "31", "32", "29", "30", "30.5", "1.04", 2],
      [s - 21, "31", "32", "29", "50", "30.5", "1.04", 5], // máximo incoherente
      [s - 86_500, "31", "32", "29", "30", "30.5", "1.04", 11],
    ]}));
    expect(await getSpotCandles("ETH", "24h")).toMatchObject({ status: "fresh", data: { intervalMinutes: 15, points: [
      { time: s - 1740, open: 31, high: 32, low: 29, close: 30, volume: 1.04 },
      { time: s - 840, open: 30, high: 34, low: 29, close: 33, volume: 1.23 },
    ] }});
    expect(String(fetcher.mock.calls[0][0])).toContain("pair=ETHUSD&interval=15");
    fetcher.mockResolvedValueOnce(reply({ USDCUSD: { bids: [["0.9981", "2", s], ["0.9990", "17.3", s]], asks: [["0.9992", "3", s], ["0.9991", "11", s]] } }));
    expect((await getSpotBook("USDC")).data).toEqual({ bids: [{ price: 0.999, quantity: 17.3 }, { price: 0.9981, quantity: 2 }], asks: [{ price: 0.9991, quantity: 11 }, { price: 0.9992, quantity: 3 }] });
    expect(isMarketAsset("__proto__")).toBe(false);
    expect(isMarketRange("4h")).toBe(false);
  });

  it("valora COP y EUR con tasa oficial fechada, sin paridad ni tasa fija si el proveedor falla", async () => {
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ base: "COP", quote: "USD", date: "2026-09-14", rate: 0.00027777 })));
    expect(await getVirtualQuote(Currency.COP)).toEqual({ source: "frankfurter", usd: "0.00027777", asOf: new Date("2026-09-14T00:00:00Z") });
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ base: "EUR", quote: "USD", date: "2026-05-01", rate: 1.1 })));
    await expect(getVirtualQuote(Currency.EUR)).rejects.toMatchObject({ statusCode: 503 });
  });
});
