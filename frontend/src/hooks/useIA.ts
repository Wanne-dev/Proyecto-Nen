/* Hook: inteligencia artificial — BANCA NEN */
import { useEffect, useState } from "react";
import { iaService, type Prediction, type ModelInfo } from "../services/ia";

export function useIA(assetId?: string) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [preds, modelInfo] = await Promise.all([iaService.getPredictions(), iaService.getModelInfo()]);
      setPredictions(preds);
      setModel(modelInfo);
      if (assetId) {
        setPrediction(preds.find((p) => p.asset === assetId) || null);
      } else if (preds.length > 0) {
        setPrediction(preds[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [assetId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { predictions, prediction, model, loading, load };
}
