/* ============================================================
   METADATA DE MONEDAS — BANCA NEN
   Información de visualización (nombre, ícono, color) y tasas de
   referencia para previsualización. Los saldos y tasas REALES
   vienen siempre de la API (billetera del usuario).
   ============================================================ */
export interface CurrencyMeta {
  name: string;
  icon: string;
  color: string;
  refRateUsd: number; // USD por 1 unidad (referencia visual)
  usdRate: number;    // alias (compatibilidad con formularios)
}

export const CURRENCY_META: Record<string, CurrencyMeta> = {
  USD: { name: "Dólar US", icon: "$", color: "#00FFAA", refRateUsd: 1, usdRate: 1 },
  COP: { name: "Peso Colombiano", icon: "$", color: "#F59E0B", refRateUsd: 1, usdRate: 1 / 3950 },
  EUR: { name: "Euro", icon: "€", color: "#3B82F6", refRateUsd: 0.92, usdRate: 0.92 },
  BTC: { name: "Bitcoin", icon: "₿", color: "#F7931A", refRateUsd: 67000, usdRate: 67000 },
  ETH: { name: "Ethereum", icon: "Ξ", color: "#8B5CF6", refRateUsd: 3500, usdRate: 3500 },
  USDC: { name: "USD Coin", icon: "$", color: "#2775CA", refRateUsd: 1, usdRate: 1 },
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_META);

export function getCurrencyMeta(currency: string): CurrencyMeta {
  return CURRENCY_META[currency] || { name: currency, icon: "$", color: "#A0A0B8", refRateUsd: 1, usdRate: 1 };
}
