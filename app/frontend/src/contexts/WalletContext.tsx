/* Contexto de billetera — BANCA NEN (wrapper sobre el store) */
import { createContext, useContext, type ReactNode } from "react";
import { useWallet } from "../hooks/useWallet";
import type { WalletContextValue } from "../types/Context.types";

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const value = useWallet();
  return <WalletContext.Provider value={value as unknown as WalletContextValue}>{children}</WalletContext.Provider>;
}

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWalletContext debe usarse dentro de <WalletProvider>");
  return ctx;
}
