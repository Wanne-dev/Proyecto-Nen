import { useEffect, useState } from "react";
import { iaService, type AnalysisMethod, type Prediction } from "../services/ia";

type AnalysisState =
  | { status: "loading" }
  | { status: "ready"; predictions: Prediction[]; method: AnalysisMethod }
  | { status: "error"; message: string };

export function useIA() {
  const [state, setState] = useState<AnalysisState>({ status: "loading" });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    void Promise.all([iaService.getPredictions(signal), iaService.getMethod(signal)])
      .then(([predictions, method]) => {
        if (!signal.aborted) setState({ status: "ready", predictions, method });
      })
      .catch((error: unknown) => {
        if (!signal.aborted) {
          setState({ status: "error", message: error instanceof Error ? error.message : "No se pudo cargar el análisis." });
          controller.abort();
        }
      });
    return () => controller.abort();
  }, [revision]);

  function reload() {
    setState({ status: "loading" });
    setRevision((value) => value + 1);
  }

  return { state, reload };
}
