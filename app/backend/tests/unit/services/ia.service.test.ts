import { afterEach, describe, expect, it, vi } from "vitest";
import { getAnalysisInput } from "../../../src/services/coingecko-analysis";
import { getAnalysisMethod, getPredictions } from "../../../src/services/ia.service";

vi.mock("../../../src/services/coingecko-analysis", () => ({ getAnalysisInput: vi.fn() }));
const market = vi.mocked(getAnalysisInput);
const sample = {
  last_updated: new Date().toISOString(),
  id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 50_000,
  price_change_percentage_24h: 2, price_change_percentage_7d_in_currency: 5,
  total_volume: 5, market_cap: 100, low_24h: 48_000, high_24h: 52_000,
};

const fresh = (data: unknown[]) => ({ status: "fresh", source: "CoinGecko", asOf: new Date().toISOString(), data } as const);

afterEach(() => {
  vi.unstubAllEnvs();
  market.mockReset();
});

describe("análisis de mercado por reglas", () => {
  it("no llama al proveedor cuando el mercado está desconectado", async () => {
    vi.stubEnv("MARKET_OFFLINE", "true");
    expect(await getPredictions()).toEqual([]);
    expect(market).not.toHaveBeenCalled();
    expect(getAnalysisMethod()).toMatchObject({ status: "offline", trained: false, kind: "heuristic" });
    expect(getAnalysisMethod()).not.toHaveProperty("accuracy");
  });

  it("conserva el cálculo, filtra por activo y no atribuye un impacto al rango informativo", async () => {
    vi.stubEnv("MARKET_OFFLINE", "false");
    market.mockResolvedValue(fresh([sample, { ...sample, id: "ethereum" }]));
    const rows = await getPredictions("bitcoin");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ score: 73, signal: "buy", horizon: "30d", predictedChangePct: 7.16, predictedPrice: 53_580 });
    expect(rows[0].features.find(({ name }) => name.includes("Rango"))?.impact).toBe(0);
  });

  it("omite registros inválidos y no inventa proyecciones ante un error del proveedor", async () => {
    vi.stubEnv("MARKET_OFFLINE", "false");
    market.mockResolvedValueOnce(fresh([null, {}, { ...sample, current_price: -100 }, { ...sample, last_updated: "2020-01-01" }]));
    expect(await getPredictions()).toEqual([]);
    market.mockResolvedValueOnce({ status: "unavailable", source: "CoinGecko", asOf: null, data: null });
    expect(await getPredictions()).toEqual([]);
  });
});
