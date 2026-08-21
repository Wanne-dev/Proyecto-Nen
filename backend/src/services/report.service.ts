/* ============================================================
   BANCA NEN — Servicio de Reportes del usuario
   Serie del portafolio, P&L y flujo de transacciones reales.
   ============================================================ */
import { AppDataSource } from "../config/database";
import { Transaction, TransactionType } from "../models/Transaction";
import { Wallet } from "../models/Wallet";
import { WalletBalance } from "../models/WalletBalance";

const txRepo = () => AppDataSource.getRepository(Transaction);
const walletRepo = () => AppDataSource.getRepository(Wallet);
const balanceRepo = () => AppDataSource.getRepository(WalletBalance);

function num(v: any) { return Number(v) || 0; }

export async function getPortfolio(userId: string, range: "7d" | "30d" | "90d" = "30d") {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const since = new Date(Date.now() - days * 86400000);

  const wallet = await walletRepo().findOne({ where: { userId } as any });
  const balances = wallet ? await balanceRepo().find({ where: { walletId: wallet.id } as any }) : [];

  const rows = await txRepo().createQueryBuilder("t")
    .select("to_char(t.created_at, 'YYYY-MM-DD')", "day")
    .addSelect("COALESCE(SUM(CASE WHEN t.type IN ('deposit','trade_sell','transfer_in') THEN t.amount_usd ELSE 0 END), 0)", "inflow")
    .addSelect("COALESCE(SUM(CASE WHEN t.type IN ('withdrawal','trade_buy','transfer_out') THEN t.amount_usd ELSE 0 END), 0)", "outflow")
    .where("t.user_id = :uid AND t.created_at >= :since", { uid: userId, since })
    .groupBy("day")
    .orderBy("day", "ASC")
    .getRawMany();

  /* Valor inicial estimado: saldo actual - flujo acumulado del periodo */
  const totalValue = num(wallet?.totalBalanceUsd);
  let cum = 0;
  for (const r of rows) cum += num(r.inflow) - num(r.outflow);
  const startValue = Math.max(0, totalValue - cum);

  const series = [];
  let running = startValue;
  const byDay: Record<string, any> = {};
  for (const r of rows) byDay[r.day] = r;
  for (let i = days; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const r = byDay[d];
    if (r) running += num(r.inflow) - num(r.outflow);
    series.push({ date: d, value: Math.round(running * 100) / 100 });
  }

  const allocation = balances
    .filter((b) => num(b.balance) > 0)
    .map((b) => ({
      currency: b.currency,
      balance: num(b.balance),
      usdRate: num(b.usdRate),
      valueUsd: Math.round(num(b.balance) * num(b.usdRate) * 100) / 100,
    }))
    .filter((a) => a.valueUsd > 0)
    .sort((a, b) => b.valueUsd - a.valueUsd);

  const allocTotal = allocation.reduce((a, b) => a + b.valueUsd, 0);
  allocation.forEach((a) => (a.pct = allocTotal > 0 ? Math.round((a.valueUsd / allocTotal) * 1000) / 10 : 0));

  const last = series[series.length - 1]?.value || 0;
  const prev = series[series.length - 2]?.value || last;
  const invested = startValue;
  const pnl = last - invested;

  return {
    range,
    series,
    totalValue: last,
    totalInvested: Math.round(invested * 100) / 100,
    totalPnl: Math.round(pnl * 100) / 100,
    pnlPct: invested > 0 ? Math.round((pnl / invested) * 10000) / 100 : 0,
    dailyPnl: Math.round((last - prev) * 100) / 100,
    allocation,
    bestAsset: allocation[0]?.currency || "—",
    worstAsset: allocation[allocation.length - 1]?.currency || "—",
  };
}

export async function getTransactionsReport(userId: string, range: "7d" | "30d" | "90d" = "30d") {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const since = new Date(Date.now() - days * 86400000);
  const rows = await txRepo().createQueryBuilder("t")
    .select("to_char(t.created_at, 'YYYY-MM-DD')", "day")
    .addSelect("t.type", "type")
    .addSelect("COALESCE(SUM(t.amount_usd), 0)", "vol")
    .where("t.user_id = :uid AND t.created_at >= :since", { uid: userId, since })
    .groupBy("day, t.type")
    .orderBy("day", "ASC")
    .getRawMany();

  const byDay: Record<string, any> = {};
  for (const r of rows) {
    byDay[r.day] = byDay[r.day] || { deposits: 0, withdrawals: 0, trades: 0 };
    if (r.type === "deposit") byDay[r.day].deposits = num(r.vol);
    if (r.type === "withdrawal") byDay[r.day].withdrawals = num(r.vol);
    if (r.type === "trade_buy" || r.type === "trade_sell") byDay[r.day].trades = num(r.vol);
  }
  const out: any[] = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push(byDay[d] || { date: d, deposits: 0, withdrawals: 0, trades: 0 });
  }
  return out;
}
