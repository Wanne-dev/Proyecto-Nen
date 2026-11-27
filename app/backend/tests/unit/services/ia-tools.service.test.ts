import { afterEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "../../../src/models/User";
import { getMarketPrice, searchFinancialNews, toolsForRole } from "../../../src/services/ia-tools.service";

const fetchMock = vi.fn();

const jsonResponse = (data: unknown) => ({
  ok: true,
  status: 200,
  headers: { get: (name: string) => name.toLowerCase() === "date" ? new Date().toUTCString() : null },
  json: async () => data,
  text: async () => JSON.stringify(data),
});
const textResponse = (body: string) => ({
  ok: true,
  status: 200,
  headers: { get: () => null },
  json: async () => ({}),
  text: async () => body,
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
});

describe("herramientas de consulta pública del asistente", () => {
  it("solo ofrece las métricas de administrador al rol administrador", () => {
    const names = (role: UserRole) => toolsForRole(role).map((item) => item.function.name);
    expect(names(UserRole.ADMIN)).toContain("getAdminOverview");
    expect(names(UserRole.USER)).not.toContain("getAdminOverview");
    expect(names(UserRole.USER)).toEqual(expect.arrayContaining(["getMarketPrice", "searchFinancialNews"]));
  });

  it("lee el precio de Binance y no inventa cifras ausentes", async () => {
    vi.stubEnv("MARKET_OFFLINE", "false");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(jsonResponse({
      lastPrice: "51234.50", priceChangePercent: "2.4", highPrice: "52000", lowPrice: "50000",
    }));
    const quote = await getMarketPrice({ symbol: "btc" });
    expect(quote).toMatchObject({ symbol: "BTC", priceUsd: 51234.5, change24hPct: 2.4, source: "Binance" });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"),
      expect.any(Object),
    );
  });

  it("rechaza símbolos no permitidos antes de hacer una petición", async () => {
    vi.stubGlobal("fetch", fetchMock);
    expect(await getMarketPrice({ symbol: "https://ejemplo.com" })).toHaveProperty("error");
    expect(await getMarketPrice({ symbol: "xyz" })).toHaveProperty("error");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devuelve hasta cinco titulares reales del RSS de Google News", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(textResponse(
      "<rss><channel>" +
      "<item><title>Bitcoin &amp; mercados</title><pubDate>Mon, 24 Nov 2025 10:00:00 GMT</pubDate></item>" +
      "<item><title><![CDATA[Segundo titular]]></title><pubDate>Mon, 24 Nov 2025 09:00:00 GMT</pubDate></item>" +
      "</channel></rss>",
    ));
    const news = await searchFinancialNews({ query: "bitcoin precio" });
    expect(news).toMatchObject({ source: "Google News RSS", query: "bitcoin precio" });
    expect(news).toHaveProperty("items", [
      { title: "Bitcoin & mercados", publishedAt: "2025-11-24T10:00:00.000Z" },
      { title: "Segundo titular", publishedAt: "2025-11-24T09:00:00.000Z" },
    ]);
    expect(fetchMock.mock.calls[0][0]).toContain("news.google.com/rss/search?q=bitcoin%20precio%20trading%20finance");
  });

  it("no consulta un tema vacío", async () => {
    vi.stubGlobal("fetch", fetchMock);
    expect(await searchFinancialNews({ query: "   " })).toHaveProperty("error");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
