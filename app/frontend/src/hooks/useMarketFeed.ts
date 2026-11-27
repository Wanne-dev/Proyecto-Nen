import { useEffect, useState } from "react";
import { getQuotes, type MarketSnapshot } from "../services/market";

const connectionLost = { status: "unavailable", source: "Kraken", asOf: null, data: null } as const;

/** El snapshot queda asociado al cargador que lo pidió (par/rango), nunca se cruza con otro. */
export function useMarketFeed<T>(load: (signal: AbortSignal) => Promise<MarketSnapshot<T>>, interval = 45_000) {
  const [state, setState] = useState<{ load: typeof load; snapshot: MarketSnapshot<T> }>();
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let request: AbortController | undefined;
    const check = async () => {
      if (request || document.visibilityState === "hidden") return;
      const controller = new AbortController();
      request = controller;
      setBusy(true);
      try {
        const snapshot = await load(controller.signal);
        if (!controller.signal.aborted) setState({ load, snapshot });
      } catch {
        if (!controller.signal.aborted) setState({ load, snapshot: connectionLost });
      } finally {
        request = undefined;
        if (!controller.signal.aborted) setBusy(false);
      }
    };
    void check();
    const timer = window.setInterval(check, interval);
    document.addEventListener("visibilitychange", check);
    return () => { request?.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", check); };
  }, [load, interval, revision]);
  return { snapshot: state?.load === load ? state.snapshot : undefined, busy, reload: () => setRevision((n) => n + 1) };
}

export const useSpotQuotes = () => useMarketFeed(getQuotes);
