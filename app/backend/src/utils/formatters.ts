/* Formateadores de datos — BANCA NEN */

export function formatMoney(amount: number, currency = "USD", decimals?: number): string {
  const d =
    decimals ??
    (currency === "COP" ? 0 : currency === "BTC" ? 8 : currency === "ETH" ? 6 : 2);
  return `${amount.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d })} ${currency}`;
}

export function formatUsd(amount: number, decimals = 2): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function formatPercent(n: number, decimals = 2, signed = true): string {
  return `${signed && n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;
}

export function formatDate(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  return (
    d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
  );
}

export function truncate(text: string, max = 120): string {
  return text.length > max ? text.slice(0, max - 3) + "..." : text;
}
