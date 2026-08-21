/* ============================================================
   THEME BANCA NEN — Paleta, tipografía y helpers compartidos
   ============================================================ */
export const C = {
  bg: "#0A0A0F",
  bg2: "#0E0E18",
  card: "#1A1A2E",
  card2: "#16162A",
  border: "#2A2A4A",
  green: "#00FFAA",
  greenBg: "#00FFAA15",
  red: "#FF3355",
  redBg: "#FF335515",
  gold: "#F59E0B",
  goldBg: "#F59E0B15",
  blue: "#3B82F6",
  blueBg: "#3B82F615",
  purple: "#8B5CF6",
  purpleBg: "#8B5CF615",
  cyan: "#22D3EE",
  t1: "#FFFFFF",
  t2: "#A0A0B8",
  t3: "#6B6B80",
};

export const FONT = "Inter, system-ui, -apple-system, sans-serif";

/* ---------- Formatos ---------- */
export function fmt(n: number, d = 2): string {
  if (!isFinite(n)) return "$0.00";
  return "$" + n.toLocaleString(undefined, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export function fmtCompact(n: number): string {
  if (!isFinite(n)) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
  if (abs >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toFixed(2);
}

export function fmtPct(n: number, d = 2): string {
  return (n >= 0 ? "+" : "") + n.toFixed(d) + "%";
}

export function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function fmtDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "hace " + s + "s";
  if (s < 3600) return "hace " + Math.floor(s / 60) + "min";
  if (s < 86400) return "hace " + Math.floor(s / 3600) + "h";
  if (s < 604800) return "hace " + Math.floor(s / 86400) + "d";
  return fmtDateShort(iso);
}

/* ---------- Badges de estado ---------- */
export function badgeStyle(color: string, bgColor?: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 8px",
    borderRadius: 999,
    backgroundColor: bgColor || color + "1A",
    color,
    fontSize: 10,
    fontWeight: 600,
    whiteSpace: "nowrap",
  };
}

/* ---------- Estilos base de inputs ---------- */
export function inputStyle(overrides: React.CSSProperties = {}): React.CSSProperties {
  return {
    width: "100%",
    padding: "8px 10px",
    fontSize: 12,
    borderRadius: 6,
    backgroundColor: C.card,
    border: "1px solid " + C.border,
    color: C.t1,
    outline: "none",
    fontFamily: FONT,
    transition: "border-color .15s",
    ...overrides,
  };
}
