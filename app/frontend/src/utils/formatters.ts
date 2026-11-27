/* Formateadores — BANCA NEN */
import { CURRENCY_NAMES, SUPPORTED_CURRENCIES } from "./constants";

export function formatMoney(amount: number, currency = "USD", decimals?: number): string {
  const d = decimals ?? (currency === "COP" ? 0 : currency === "BTC" ? 8 : currency === "ETH" ? 6 : 2);
  return amount.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d }) + " " + currency;
}

export function formatUsd(amount: number, decimals = 2): string {
  return "$" + amount.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatCompact(n: number): string {
  if (!isFinite(n)) return "0";
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(Math.round(n * 100) / 100);
}

export function formatPercent(n: number, decimals = 2, signed = true): string {
  return (signed && n >= 0 ? "+" : "") + n.toFixed(decimals) + "%";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

export function formatTimeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "hace " + s + "s";
  if (s < 3600) return "hace " + Math.floor(s / 60) + "min";
  if (s < 86400) return "hace " + Math.floor(s / 3600) + "h";
  return "hace " + Math.floor(s / 86400) + "d";
}

export function currencyName(code: string): string {
  return CURRENCY_NAMES[code] || code;
}

export function isSupportedCurrency(code: string): boolean {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}

export function maskAccount(number: string): string {
  return "**** " + number.slice(-4);
}
