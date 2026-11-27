import { geminiChatEnabled, geminiModel, offlineMarketEnabled } from "../config/operations";
import { getAnalysisInput } from "./coingecko-analysis";

export type ProjectionHorizon = "24h" | "7d" | "30d";

export interface Prediction {
  asset: string;
  symbol: string;
  name: string;
  currentPrice: number;
  predictedPrice: number;
  predictedChangePct: number;
  score: number;
  /** Intensidad heurística conservada en la respuesta; no es una probabilidad. */
  confidence: number;
  horizon: ProjectionHorizon;
  signal: "buy" | "sell" | "hold";
  riskLevel: "low" | "medium" | "high";
  features: Array<{ name: string; value: number; impact: number; direction: 1 | -1 }>;
}

const HORIZONS = ["30d", "7d", "24h"] as const;
const HORIZON_FACTOR: Record<ProjectionHorizon, number> = { "24h": 0.8, "7d": 1.4, "30d": 2.2 };
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);
const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;

function project(raw: unknown, index: number): Prediction | null {
  if (!raw || typeof raw !== "object") return null;
  const coin = raw as Record<string, unknown>;
  const { id, symbol, name } = coin;
  const currentPrice = finite(coin.current_price);
  const updated = typeof coin.last_updated === "string" ? Date.parse(coin.last_updated) : NaN;
  if (!Number.isFinite(updated) || updated > Date.now() + 30_000 || Date.now() - updated > 15 * 60_000) return null;
  if (typeof id !== "string" || typeof symbol !== "string" || typeof name !== "string" || currentPrice <= 0) return null;

  const chg24 = finite(coin.price_change_percentage_24h);
  const chg7 = finite(coin.price_change_percentage_7d_in_currency);
  const volume = finite(coin.total_volume);
  const cap = finite(coin.market_cap);
  const relativeVolume = cap > 0 && volume >= 0 ? finite(volume / cap) : 0;
  const low = finite(coin.low_24h);
  const high = finite(coin.high_24h);
  const range24h = low > 0 && high >= low ? finite((high / low - 1) * 100) : 0;

  const rawTrend = chg24 * 3 + chg7 * 1.2;
  if (!Number.isFinite(rawTrend)) return null;
  const trendScore = clamp(rawTrend, -40, 40);
  const trendScale = rawTrend === 0 ? 1 : trendScore / rawTrend;
  const volScore = clamp((relativeVolume - 0.03) * 400, -15, 15);
  const momentum = clamp(chg24, -10, 10) * 1.5;
  const score = Math.round(clamp(50 + trendScore + volScore + momentum, 8, 97));
  const horizon = HORIZONS[index % HORIZONS.length];
  const predictedChange = clamp(chg24 * HORIZON_FACTOR[horizon] + (score - 50) * 0.12, -25, 35);
  const projectedPrice = currentPrice * (1 + predictedChange / 100);
  if (!Number.isFinite(projectedPrice)) return null;
  const factor = (name: string, value: number, impact: number): Prediction["features"][number] => ({
    name, value, impact, direction: impact >= 0 ? 1 : -1,
  });
  const features = [
    factor("Tendencia 24 h", chg24, chg24 * 3 * trendScale),
    factor("Tendencia 7 días", chg7, chg7 * 1.2 * trendScale),
    factor("Volumen relativo", relativeVolume, volScore),
    factor("Impulso 24 h", chg24, momentum),
    factor("Rango 24 h (informativo)", range24h, 0),
  ].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return {
    asset: id, symbol: symbol.toUpperCase(), name, currentPrice,
    predictedPrice: Number(projectedPrice.toFixed(projectedPrice < 1 ? 8 : 2)),
    predictedChangePct: Number(predictedChange.toFixed(2)),
    score,
    confidence: Number((0.6 + Math.abs(score - 50) / 200).toFixed(2)),
    horizon,
    signal: score >= 62 ? "buy" : score <= 42 ? "sell" : "hold",
    riskLevel: score >= 62 ? "low" : score <= 42 ? "high" : "medium",
    features,
  };
}

export async function getPredictions(assetId?: string): Promise<Prediction[]> {
  if (offlineMarketEnabled()) return [];
  const snapshot = await getAnalysisInput("usd");
  if (snapshot.status !== "fresh") return [];
  return snapshot.data.map(project).filter((entry): entry is Prediction => entry !== null && (!assetId || entry.asset === assetId));
}

/** La ruta /ia/model se conserva para los clientes instalados. Las predicciones siguen siendo reglas; el chat usa un modelo externo. */
export function getAnalysisMethod() {
  return {
    name: "Reglas de mercado", kind: "heuristic", version: "1.0.0",
    source: "CoinGecko", status: offlineMarketEnabled() ? "offline" : "available",
    trained: false, calibrated: false,
    assistant: {
      provider: "Google Gemini",
      model: geminiModel(),
      status: geminiChatEnabled() ? "connected" : "disconnected",
      tools: ["getMarketPrice", "searchFinancialNews"],
      adminTools: ["getAdminOverview"],
    },
  } as const;
}
