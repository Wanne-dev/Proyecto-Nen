/* Contexto de trading — BANCA NEN (wrapper sobre el store) */
import { createContext, useContext, type ReactNode } from "react";
import { useTrading } from "../hooks/useTrading";
import type { TradingContextValue } from "../types/Context.types";

const TradingContext = createContext<TradingContextValue | null>(null);

export function TradingProvider({ children }: { children: ReactNode }) {
  const value = useTrading();
  return <TradingContext.Provider value={value as unknown as TradingContextValue}>{children}</TradingContext.Provider>;
}

export function useTradingContext() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTradingContext debe usarse dentro de <TradingProvider>");
  return ctx;
}
