/* Página de Reportes — BANCA NEN */
import { useEffect, useState } from "react";
import { FileBarChart, Download, FileSpreadsheet, FileText, CalendarDays, TrendingUp, TrendingDown } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/common/StatCard";
import PerformanceChart from "../../components/charts/PerformanceChart";
import Spinner from "../../components/ui/Spinner";
import { reportService, exportCSV, exportJSON, type PortfolioReport, type TxFlowPoint } from "../../services/reports";
import { getCurrencyMeta } from "../../constants/currencies";
import { useUIStore } from "../../store/ui.slice";
import { C, FONT, fmt, fmtDateShort } from "../../theme";

type Range = "7d" | "30d" | "90d";

export default function Reports() {
  const toast = useUIStore((s) => s.toast);
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<PortfolioReport | null>(null);
  const [txSeries, setTxSeries] = useState<TxFlowPoint[] | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([reportService.getPortfolio(range), reportService.getTransactions(range)]).then(([r, t]) => {
      setReport(r);
      setTxSeries(t);
      setLoading(false);
    });
  }, [range]);

  const exportPdf = () => {
    toast("success", "Reporte PDF generado", "Se descargó reporte-portafolio.pdf (demo)");
  };
  const exportExcel = () => {
    exportCSV("reporte-portafolio-banca-nen", ["Fecha", "Valor USD"], (report?.series || []).map((p) => [p.date, p.value]));
    toast("success", "Reporte Excel (CSV) generado");
  };

  const ranges: Range[] = ["7d", "30d", "90d"];

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader
        title="Reportes"
        subtitle="Rendimiento de tu portafolio, flujo de transacciones y exportación PDF / Excel / CSV"
        icon={<FileBarChart size={19} color={C.blue} />}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<FileText size={13} />} onClick={exportPdf}>PDF</Button>
            <Button variant="outline" size="sm" icon={<FileSpreadsheet size={13} />} onClick={exportExcel}>Excel</Button>
            <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={() => { exportJSON("reporte-portafolio", report); toast("success", "JSON exportado"); }}>JSON</Button>
          </>
        }
      />

      {/* Rango */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <CalendarDays size={14} color={C.t3} />
        <div style={{ display: "flex", gap: 4 }}>
          {ranges.map((r) => (
            <button key={r} onClick={() => setRange(r)} style={{ padding: "5px 14px", fontSize: 11, fontWeight: range === r ? 700 : 400, borderRadius: 6, backgroundColor: range === r ? C.gold : C.card, color: range === r ? C.bg : C.t2, border: "1px solid " + (range === r ? C.gold : C.border), cursor: "pointer", fontFamily: FONT }}>
              {r === "7d" ? "7 días" : r === "30d" ? "30 días" : "90 días"}
            </button>
          ))}
        </div>
      </div>

      {loading || !report ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 70 }}>
          <Spinner size={30} label="Generando reporte..." />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
            <StatCard label="Valor del portafolio" value={fmt(report.totalValue)} trend={report.pnlPct} icon={<TrendingUp size={14} color={C.green} />} color={C.green} />
            <StatCard label="Total invertido" value={fmt(report.totalInvested)} sub="Capital aportado" icon={<FileBarChart size={14} color={C.blue} />} color={C.blue} />
            <StatCard label="Ganancia / Pérdida" value={fmt(report.totalPnl)} trend={report.pnlPct} icon={<TrendingDown size={14} color={report.totalPnl >= 0 ? C.green : C.red} />} color={report.totalPnl >= 0 ? C.green : C.red} />
            <StatCard label="P&L del día" value={fmt(report.dailyPnl)} trend={report.dailyPnl > 0 ? 0.5 : -0.5} icon={<CalendarDays size={14} color={C.gold} />} color={C.gold} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, alignItems: "start" }}>
            {/* Serie */}
            <Card title={`Rendimiento · últimos ${range === "7d" ? "7" : range === "30d" ? "30" : "90"} días`} subtitle="Valor del portafolio en USD">
              <PerformanceChart data={report.series.map((p) => ({ ...p, date: fmtDateShort(p.date) }))} color={report.pnlPct >= 0 ? C.green : C.red} height={280} />
              <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 10, flexWrap: "wrap" }}>
                <span style={{ color: C.t3 }}>Mejor activo: <strong style={{ color: C.green }}>{report.bestAsset}</strong></span>
                <span style={{ color: C.t3 }}>Activo más débil: <strong style={{ color: C.red }}>{report.worstAsset}</strong></span>
                <span style={{ color: C.t3 }}>Rendimiento: <strong style={{ color: report.pnlPct >= 0 ? C.green : C.red }}>{report.pnlPct}%</strong></span>
              </div>
            </Card>

            {/* Distribución */}
            <Card title="Distribución del portafolio" subtitle="Por activo">
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {report.allocation.map((a) => {
                  const meta = getCurrencyMeta(a.currency);
                  return (
                    <div key={a.currency}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: C.t2, fontWeight: 600 }}>{meta.icon} {a.currency} · {a.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                        <span style={{ color: C.t1, fontWeight: 700 }}>{a.pct}% · {fmt(a.valueUsd)}</span>
                      </div>
                      <div style={{ height: 7, borderRadius: 999, backgroundColor: C.border, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: a.pct + "%", backgroundColor: meta.color, borderRadius: 999 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Flujo de transacciones */}
          {txSeries && (
            <div style={{ marginTop: 14 }}>
              <Card title="Flujo de transacciones" subtitle="Depósitos, retiros y volumen de trading (USD)">
                <PerformanceChart
                  data={txSeries.map((p) => ({ date: fmtDateShort(p.date), Depósitos: p.deposits, Retiros: p.withdrawals, Trading: p.trades }))}
                  dataKey="Depósitos"
                  color={C.blue}
                  height={230}
                  gradientId="txGrad1"
                />
                <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 10, flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, color: C.t3 }}><span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: C.blue }} /> Depósitos</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, color: C.t3 }}><span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: C.red }} /> Retiros</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, color: C.t3 }}><span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: C.green }} /> Trading</span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <Badge tone="green">Reportes generados en tiempo real · auditoría inmutable</Badge>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
