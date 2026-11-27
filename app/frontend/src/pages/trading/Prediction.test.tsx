import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { iaService, type AnalysisMethod, type Prediction as AssetProjection } from "../../services/ia";
import Prediction from "./Prediction";

vi.mock("../../services/ia", () => ({ iaService: { getPredictions: vi.fn(), getMethod: vi.fn() } }));
vi.mock("../../components/charts/PredictionChart", () => ({ default: () => <div>Gráfico comparativo</div> }));

const estimates = vi.mocked(iaService.getPredictions);
const method = vi.mocked(iaService.getMethod);
const info: AnalysisMethod = { name: "Reglas de mercado", source: "CoinGecko", kind: "heuristic", status: "available" };
const btc: AssetProjection = {
  asset: "bitcoin", symbol: "BTC", name: "Bitcoin", currentPrice: 50_000, predictedPrice: 50_500,
  predictedChangePct: 1, horizon: "24h", score: 73, signal: "buy", features: [{ name: "Impulso 24 h", value: 2, impact: 3 }],
};

afterEach(() => vi.resetAllMocks());

describe("Análisis de mercado", () => {
  it("distingue el modo sin conexión y no presenta datos inventados", async () => {
    estimates.mockResolvedValue([]);
    method.mockResolvedValue({ ...info, status: "offline" });
    render(<Prediction />);
    expect(await screen.findByText(/El mercado está desconectado/)).toBeVisible();
    expect(screen.queryByText("Precio estimado")).not.toBeInTheDocument();
  });

  it("muestra un error y permite reintentar sin presentar el cálculo como un modelo entrenado", async () => {
    estimates.mockRejectedValueOnce(new Error("No se pudo conectar")).mockResolvedValue([btc]);
    method.mockResolvedValue(info);
    render(<Prediction />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo conectar");
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(await screen.findByText("Precio estimado")).toBeVisible();
    expect(screen.getByText("No mide probabilidad de acierto")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("actualiza el detalle seleccionado cuando llega una nueva cotización", async () => {
    const eth = { ...btc, asset: "ethereum", symbol: "ETH", name: "Ethereum", score: 50 };
    estimates.mockResolvedValueOnce([btc, eth]).mockResolvedValueOnce([btc, { ...eth, score: 62 }]);
    method.mockResolvedValue(info);
    render(<Prediction />);
    fireEvent.click(await screen.findByRole("button", { name: /ETH 50/ }));
    expect(screen.getByRole("heading", { name: /Ethereum/ })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));
    expect(await screen.findByRole("button", { name: /ETH 62/ })).toHaveAttribute("aria-pressed", "true");
  });
});
