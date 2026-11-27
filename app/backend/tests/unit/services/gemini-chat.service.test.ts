import { afterEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "../../../src/models/User";
import { analyzeNewsImpact, chatWithGemini } from "../../../src/services/gemini-chat.service";
import { getAdminOverview, getAssistantPortfolio } from "../../../src/services/ia-portfolio.service";
import { executeIaTool } from "../../../src/services/ia-tools.service";

vi.mock("../../../src/services/ia-portfolio.service", () => ({ getAssistantPortfolio: vi.fn(), getAdminOverview: vi.fn() }));
vi.mock("../../../src/services/ia-tools.service", () => ({
  IA_TOOLS: [],
  toolsForRole: vi.fn(() => []),
  executeIaTool: vi.fn(),
}));

const fetchMock = vi.fn();
const portfolio = vi.mocked(getAssistantPortfolio);
const overview = vi.mocked(getAdminOverview);
const tool = vi.mocked(executeIaTool);

const jsonResponse = (data: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
  portfolio.mockReset();
  overview.mockReset();
  tool.mockReset();
});

describe("chat con el proveedor de IA", () => {
  it("ejecuta las herramientas que pide el modelo y responde con el texto final", async () => {
    vi.stubEnv("GEMINI_API_KEY", "clave-de-prueba");
    portfolio.mockResolvedValue("Billetera virtual con 100 USD.");
    tool.mockResolvedValue({ symbol: "BTC", priceUsd: 51234.5, source: "Binance" });
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { role: "assistant", content: null, tool_calls: [
        { id: "call_1", type: "function", function: { name: "getMarketPrice", arguments: '{"symbol":"BTC"}' } },
      ] } }] }))
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { role: "assistant", content: "BTC: 51234,50 USD según Binance." } }] }));

    const result = await chatWithGemini("usuario-1", "¿Cuánto vale BTC?", UserRole.USER);
    expect(result).toEqual({ reply: "BTC: 51234,50 USD según Binance.", usedTools: ["getMarketPrice"] });
    expect(tool).toHaveBeenCalledWith("getMarketPrice", { symbol: "BTC" }, UserRole.USER);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer clave-de-prueba" }),
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ model: "gemini-3.5-flash-lite" });
  });

  it("traduce el límite de cuota del proveedor en un error claro", async () => {
    vi.stubEnv("GEMINI_API_KEY", "clave-de-prueba");
    vi.stubGlobal("fetch", fetchMock);
    portfolio.mockResolvedValue("Sin saldos.");
    fetchMock.mockResolvedValue(jsonResponse({}, 429));
    await expect(chatWithGemini("usuario-1", "Hola", UserRole.USER)).rejects.toThrow(/cuota gratuita/i);
  });

  it("niega las herramientas de administrador a un usuario normal", async () => {
    vi.stubEnv("GEMINI_API_KEY", "clave-de-prueba");
    portfolio.mockResolvedValue("Billetera del usuario.");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(jsonResponse({ choices: [{ message: {
      content: "Esa consulta requiere perfil de administrador.",
      tool_calls: [{ id: "call_admin", type: "function", function: { name: "getAdminOverview", arguments: "{}" } }],
    } }] }));
    const result = await chatWithGemini("usuario-1", "¿Cuántos usuarios hay?", UserRole.USER);
    expect(result.usedTools).toEqual([]);
    expect(result.reply).toMatch(/administrador/i);
    expect(tool).not.toHaveBeenCalled();
  });

  it("permite la herramienta de administrador solo al rol administrador", async () => {
    vi.stubEnv("GEMINI_API_KEY", "clave-de-prueba");
    portfolio.mockResolvedValue("Resumen agregado.");
    overview.mockResolvedValue({ users: { total: 2 } });
    tool.mockResolvedValue({ users: { total: 2 } });
    vi.stubGlobal("fetch", fetchMock);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { role: "assistant", content: null, tool_calls: [
        { id: "call_admin", type: "function", function: { name: "getAdminOverview", arguments: "{}" } },
      ] } }] }))
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: "Hay 2 usuarios." } }] }));
    const result = await chatWithGemini("admin-1", "¿Cuántos usuarios hay?", UserRole.ADMIN);
    expect(result.usedTools).toEqual(["getAdminOverview"]);
    expect(tool).toHaveBeenCalledWith("getAdminOverview", {}, UserRole.ADMIN);
    expect(overview).toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].body).toContain("Resumen agregado de la plataforma");
  });

  it("no llama al proveedor si no hay clave configurada", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubGlobal("fetch", fetchMock);
    portfolio.mockResolvedValue("Sin saldos.");
    await expect(chatWithGemini("usuario-1", "Hola", UserRole.USER)).rejects.toThrow(/no está configurado/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("analiza una noticia con JSON validado, sin tools ni contexto de billetera", async () => {
    vi.stubEnv("GEMINI_API_KEY", "clave-de-prueba");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content:
      '```json\n{"sentiment":"alcista","assets":["BTC","ETH"],"impactSummary":"El mercado recibe la noticia con optimismo."}\n```',
    } }] }));

    const impact = await analyzeNewsImpact("Bitcoin y Ethereum suben", "Mercado en alza.");
    expect(impact).toEqual({ sentiment: "alcista", assets: ["BTC", "ETH"], impactSummary: "El mercado recibe la noticia con optimismo." });
    expect(portfolio).not.toHaveBeenCalled();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("gemini-3.5-flash-lite");
    expect(body.tools).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("Billetera");
  });
});
