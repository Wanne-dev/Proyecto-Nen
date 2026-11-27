import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { marketFeed, publicJson } from "../../../src/services/market-feed";

const now = Date.parse("2026-09-15T14:23:00Z");
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv("MARKET_OFFLINE", "false"); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("observaciones de mercado", () => {
  it("agrupa peticiones, conserva la observación real fechada ante un fallo y deja de servirla al vencer", async () => {
    const load = vi.fn().mockResolvedValueOnce({ at: now - 1000, data: { price: 47.12 } }).mockRejectedValue(new Error("sin conexión"));
    const feed = marketFeed<"btc", { price: number }>("Fuente", 30_000, 60_000, 300_000, load);
    const [first, second] = await Promise.all([feed("btc"), feed("btc")]);
    expect(first).toEqual({ status: "fresh", data: { price: 47.12 }, source: "Fuente", asOf: new Date(now - 1000).toISOString() });
    expect(second).toEqual(first);
    expect(load).toHaveBeenCalledTimes(1);
    vi.setSystemTime(now + 35_000);
    expect(await feed("btc")).toEqual({ ...first, status: "stale" });
    await feed("btc");
    expect(load).toHaveBeenCalledTimes(2);
    vi.setSystemTime(now + 300_000);
    expect(await feed("btc")).toEqual({ status: "unavailable", source: "Fuente", asOf: null, data: null });
  });

  it("no reetiqueta como actual una respuesta HTTP cacheada ni consulta el proveedor en modo offline", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"price": 12}', { headers: { Date: new Date(now).toUTCString(), Age: "180" } }));
    vi.stubGlobal("fetch", fetcher);
    const feed = marketFeed("Fuente", 30_000, 60_000, 300_000, () => publicJson("https://prices.example.com"));
    expect(await feed("btc")).toMatchObject({ status: "stale", asOf: new Date(now - 180_000).toISOString() });
    vi.stubEnv("MARKET_OFFLINE", "true");
    expect(await feed("btc")).toEqual({ status: "offline", source: "Fuente", asOf: null, data: null });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
