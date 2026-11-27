/* Constantes de dominio compartidas — BANCA NEN */

export const SUPPORTED_CURRENCIES = ["USD", "COP", "EUR", "BTC", "ETH", "USDC"] as const;

export const DEFAULT_CURRENCY = "USD";

export const TRADING_FEE_RATE = 0.001;

export const MIN_DEPOSIT_USD = 5;
export const MIN_WITHDRAWAL_USD = 10;

export const RISK_LEVELS = ["low", "medium", "high"] as const;
