import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { newsService, type TradingNewsFeed } from "../../services/news";
import TradingNews from "./TradingNews";

vi.mock("../../services/news", () => ({ newsService: { search: vi.fn(), analyze: vi.fn() } }));

const search = vi.mocked(newsService.search);
const analyze = vi.mocked(newsService.analyze);
const item = {
  id: "abc12345",
  title: "Bitcoin y Ethereum repuntan ante la expectativa del mercado",
  link: "https://news.google.com/rss/articles/abc?oc=5",
  pubDate: "2026-11-27T08:00:00.000Z",
  source: "CoinDesk",
  snippet: "Los principales activos digitales avanzan.",
  image: "https://www.google.com/s2/favicons?domain=www.coindesk.com&sz=128",
};
const feed: TradingNewsFeed = {
  query: "(bitcoin) AND (trading OR mercado)",
  category: "all",
  source: "Google News RSS",
  items: [item],
  cached: false,
};

afterEach(() => vi.resetAllMocks());

describe("Portal de noticias financieras", () => {
  it("muestra titulares reales enlazados a su fuente original", async () => {
    search.mockResolvedValue(feed);
    render(<TradingNews />);
    const link = await screen.findByRole("link", { name: /Bitcoin y Ethereum repuntan/ });
    expect(link).toHaveAttribute("href", item.link);
    expect(link).toHaveAttribute("target", "_blank");
    expect(screen.getByText("CoinDesk")).toBeVisible();
    expect(search).toHaveBeenCalledWith("", "all", expect.any(AbortSignal));
  });

  it("busca el tema escrito y cambia de categoría con chips", async () => {
    search.mockResolvedValue(feed);
    render(<TradingNews />);
    await screen.findByRole("link", { name: /Bitcoin y Ethereum repuntan/ });

    fireEvent.change(screen.getByRole("textbox", { name: "Buscar noticias financieras" }), { target: { value: "FED" } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await waitFor(() => expect(search).toHaveBeenCalledWith("FED", "all", expect.any(AbortSignal)));

    fireEvent.click(screen.getByRole("button", { name: "Cripto" }));
    await waitFor(() => expect(search).toHaveBeenCalledWith("FED", "crypto", expect.any(AbortSignal)));
    expect(screen.getByRole("button", { name: "Cripto" })).toHaveAttribute("aria-pressed", "true");
  });

  it("muestra el sentimiento y los activos del análisis IA", async () => {
    search.mockResolvedValue(feed);
    analyze.mockResolvedValue({ sentiment: "alcista", assets: ["BTC"], impactSummary: "Tono positivo del titular." });
    render(<TradingNews />);
    fireEvent.click(await screen.findByRole("button", { name: /Analizar impacto IA de/ }));
    expect(await screen.findByText(/Sentimiento alcista/)).toBeVisible();
    expect(screen.getByText("BTC")).toBeVisible();
    expect(screen.getByText("Tono positivo del titular.")).toBeVisible();
    expect(analyze).toHaveBeenCalledWith(item.title, item.snippet);
  });

  it("muestra un error con reintento cuando falla el feed", async () => {
    search.mockRejectedValueOnce(new Error("Feed no disponible")).mockResolvedValue(feed);
    render(<TradingNews />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Feed no disponible");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("link", { name: /Bitcoin y Ethereum repuntan/ })).toBeVisible();
  });
});
