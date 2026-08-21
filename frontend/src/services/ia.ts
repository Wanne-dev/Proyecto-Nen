/* ============================================================
   SERVICIO DE IA — BANCA NEN (API real del backend)
   ============================================================ */
import api, { unwrap } from "../api/client";

export interface Prediction {
  asset: string;
  symbol: string;
  name: string;
  currentPrice: number;
  predictedPrice: number;
  predictedChangePct: number;
  score: number;
  confidence: number;
  horizon: string;
  signal: "buy" | "sell" | "hold";
  riskLevel: "low" | "medium" | "high";
  features: Array<{ name: string; value: number; impact: number; direction: 1 | -1 }>;
}

export interface ModelInfo {
  name: string;
  version: string;
  architecture: string;
  lastTraining: string;
  nextTraining: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  samples: number;
  featuresCount: number;
  status: "training" | "ready" | "error";
}

export const iaService = {
  async getPredictions(): Promise<Prediction[]> {
    const res = await api.get("/ia/predictions");
    return unwrap<Prediction[]>(res.data) || [];
  },

  async getPredictionForAsset(assetId: string): Promise<Prediction | null> {
    const res = await api.get("/ia/predictions", { params: { assetId } });
    const data = unwrap<Prediction[]>(res.data) || [];
    return data[0] || null;
  },

  async getScore(assetId: string): Promise<number> {
    const p = await this.getPredictionForAsset(assetId);
    return p?.score ?? 50;
  },

  async getModelInfo(): Promise<ModelInfo> {
    const res = await api.get("/ia/model");
    return unwrap<ModelInfo>(res.data);
  },
};
