/* Identidad visual de las monedas. Las cotizaciones no son constantes de la interfaz. */
export interface CurrencyMeta {
  name: string;
  icon: string;
  color: string;
}

export const CURRENCY_META: Record<string, CurrencyMeta> = {
  USD: { name: "Dólar US", icon: "$", color: "#00FFAA" },
  COP: { name: "Peso Colombiano", icon: "$", color: "#F59E0B" },
  EUR: { name: "Euro", icon: "€", color: "#3B82F6" },
  BTC: { name: "Bitcoin", icon: "₿", color: "#F7931A" },
  ETH: { name: "Ethereum", icon: "Ξ", color: "#8B5CF6" },
  USDC: { name: "USD Coin", icon: "$", color: "#2775CA" },
};

export const SUPPORTED_CURRENCIES = Object.keys(CURRENCY_META);
export const CURRENCY_DECIMALS: Record<string, number> = { USD: 2, COP: 2, EUR: 2, BTC: 8, ETH: 8, USDC: 6 };

export function walletCurrencyOrDefault(value: string | null): string {
  return value && SUPPORTED_CURRENCIES.includes(value) ? value : "USD";
}

export function getCurrencyMeta(currency: string): CurrencyMeta {
  return CURRENCY_META[currency] || { name: currency, icon: "$", color: "#A0A0B8" };
}
