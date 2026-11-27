import api, { unwrap } from "../api/client";

export type ProjectionHorizon = "24h" | "7d" | "30d";

export interface Prediction {
  asset: string;
  symbol: string;
  name: string;
  currentPrice: number;
  predictedPrice: number;
  predictedChangePct: number;
  score: number;
  horizon: ProjectionHorizon;
  signal: "buy" | "sell" | "hold";
  features: Array<{ name: string; value: number; impact: number }>;
}

export interface AssistantMethod {
  provider: string;
  model: string;
  status: "connected" | "disconnected";
  tools: string[];
  adminTools?: string[];
}

export interface AnalysisMethod {
  name: string;
  source: string;
  kind: "heuristic";
  status: "offline" | "available";
  assistant?: AssistantMethod;
}

export interface ChatResponse {
  reply: string;
  usedTools: string[];
}

export const iaService = {
  async getPredictions(signal?: AbortSignal): Promise<Prediction[]> {
    const res = await api.get("/ia/predictions", { signal });
    return unwrap<Prediction[]>(res.data);
  },

  async getMethod(signal?: AbortSignal): Promise<AnalysisMethod> {
    const res = await api.get("/ia/model", { signal });
    return unwrap<AnalysisMethod>(res.data);
  },

  async chat(message: string, signal?: AbortSignal): Promise<ChatResponse> {
    const res = await api.post("/ia/chat", { message }, { signal, timeout: 30_000 });
    return unwrap<ChatResponse>(res.data);
  },
};
