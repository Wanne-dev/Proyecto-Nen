/* Constantes globales — BANCA NEN */
export const APP_NAME = "BANCA NEN";
export const APP_TAGLINE = "Invierte con inteligencia, respaldado por IA y seguridad bancaria";

export const SUPPORTED_CURRENCIES = ["USD", "COP", "EUR", "BTC", "ETH", "USDC"] as const;

export const CURRENCY_NAMES: Record<string, string> = {
  USD: "Dólar estadounidense",
  COP: "Peso colombiano",
  EUR: "Euro",
  BTC: "Bitcoin",
  ETH: "Ethereum",
  USDC: "USD Coin",
};

export const ORDER_TYPES = [
  { id: "market", label: "Mercado" },
  { id: "limit", label: "Límite" },
  { id: "stop_loss", label: "Stop-Loss" },
  { id: "take_profit", label: "Take-Profit" },
  { id: "stop_limit", label: "Stop-Límite" },
  { id: "trailing_stop", label: "Trailing Stop" },
  { id: "oco", label: "OCO" },
] as const;

export const TRADING_FEE = 0.001;

export const TIME_FRAMES = ["1M", "5M", "15M", "1H", "4H", "1D", "1W", "1MO"] as const;

export const TOAST_DURATION = 4200;

export const PAGINATION_SIZES = [10, 20, 50];
