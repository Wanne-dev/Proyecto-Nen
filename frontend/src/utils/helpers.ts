/* Funciones auxiliares — BANCA NEN */
export function cls(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function uid(prefix = "id"): string {
  return prefix + "-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function initials(first?: string, last?: string): string {
  return ((first?.[0] || "") + (last?.[0] || "")).toUpperCase();
}

export function percentOf(part: number, total: number): number {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

export function pnlColor(pnl: number, upColor = "#00FFAA", downColor = "#FF3355"): string {
  return pnl >= 0 ? upColor : downColor;
}

export function sortBy<T>(items: T[], key: keyof T, dir: "asc" | "desc" = "asc"): T[] {
  return [...items].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (typeof va === "number" && typeof vb === "number") return dir === "asc" ? va - vb : vb - va;
    return dir === "asc"
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va));
  });
}

export function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const k = String(item[key]);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
