import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBook, getCandles, getQuotes, type MarketSnapshot, type Quotes } from "../../services/market";
import Trading from "./Trading";

vi.mock("../../services/market", async (importActual) => ({
  ...(await importActual<typeof import("../../services/market")>()),
  getQuotes: vi.fn(), getCandles: vi.fn(), getBook: vi.fn(),
}));
vi.mock("../../store/wallet.slice", () => ({ useWalletStore: (pick: (state: unknown) => unknown) => pick(wallet) }));
vi.mock("../../store/trading.slice", () => ({ useTradingStore: (pick: (state: unknown) => unknown) => pick({ placeOrder }) }));
vi.mock("../../components/charts/PriceChart", () => ({ default: ({ data }: { data: { close: number }[] }) => <p>{data[0].close}</p> }));

const wallet = { wallet: { balances: [] }, refresh: vi.fn() };
const placeOrder = vi.fn();
const asOf = "2026-09-15T14:23:00Z";
const unavailable = { status: "unavailable", source: "Kraken", asOf: null, data: null } as const;
const example = { price: 64111.12, changeDayPct: 0.57, high24h: 65690.7, low24h: 63901.22, volume24h: 102 };
const quotes = (status: "fresh" | "stale"): MarketSnapshot<Quotes> => ({ status, source: "Kraken", asOf, data: { BTC: example } });
const show = () => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Trading /></MemoryRouter>);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getQuotes).mockResolvedValue(unavailable);
  vi.mocked(getCandles).mockResolvedValue(unavailable);
  vi.mocked(getBook).mockResolvedValue(unavailable);
});

describe("mercado en el portal", () => {
  it("no instala cifras ni velas de ejemplo cuando el proveedor no está disponible", async () => {
    show();
    await screen.findByText("No se muestran datos de ejemplo.");
    expect(screen.getByTestId("spot-price")).toHaveTextContent("—");
    expect(screen.queryByText("Último cierre del gráfico:", { exact: false })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Cantidad (BTC)"), { target: { value: "0.001" } });
    expect(screen.getByRole("button", { name: "Comprar BTC" })).toBeDisabled();
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it("muestra la fecha de los datos atrasados pero solo habilita órdenes con una cotización vigente", async () => {
    vi.mocked(getQuotes).mockResolvedValueOnce(quotes("stale")).mockResolvedValueOnce(quotes("fresh"));
    show();
    const order = screen.getByRole("button", { name: "Comprar BTC" });
    await screen.findByText("Kraken · Datos atrasados");
    expect(screen.getByTestId("spot-price")).toHaveTextContent("64.111,12");
    fireEvent.change(screen.getByLabelText("Cantidad (BTC)"), { target: { value: "0.001" } });
    expect(order).toBeDisabled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Actualizar" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    await waitFor(() => expect(order).toBeEnabled());
    expect(screen.queryByText("Kraken · Datos atrasados")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar ETH" }));
    expect(screen.getByTestId("spot-price")).toHaveTextContent("—");
    expect(screen.getByRole("button", { name: "Comprar ETH" })).toBeDisabled();
    await waitFor(() => expect(getCandles).toHaveBeenCalledWith("ETH", "24h", expect.any(AbortSignal)));
    await screen.findByText("No se muestran datos de ejemplo.");
  });
});
