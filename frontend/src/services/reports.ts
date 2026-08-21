/* ============================================================
   SERVICIO DE REPORTES — BANCA NEN (API real)
   ============================================================ */
import api, { unwrap } from "../api/client";

export interface ReportSeriesPoint {
  date: string;
  value: number;
}

export interface PortfolioReport {
  range: string;
  series: ReportSeriesPoint[];
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  pnlPct: number;
  dailyPnl: number;
  bestAsset: string;
  worstAsset: string;
  allocation: Array<{ currency: string; balance: number; usdRate: number; valueUsd: number; pct: number }>;
}

export interface TxFlowPoint {
  date: string;
  deposits: number;
  withdrawals: number;
  trades: number;
}

export const reportService = {
  async getPortfolio(range: "7d" | "30d" | "90d" = "30d"): Promise<PortfolioReport> {
    const res = await api.get("/reports/portfolio", { params: { range } });
    return unwrap<PortfolioReport>(res.data);
  },

  async getTransactions(range: "7d" | "30d" | "90d" = "30d"): Promise<TxFlowPoint[]> {
    const res = await api.get("/reports/transactions", { params: { range } });
    return unwrap<TxFlowPoint[]>(res.data) || [];
  },
};

/* ---------- Exportaciones (utilidades puras) ---------- */
export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename + ".json";
  a.click();
  URL.revokeObjectURL(url);
}
