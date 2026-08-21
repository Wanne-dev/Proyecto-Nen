/* Reportes Administrativos (admin) — BANCA NEN */
import { useEffect, useState } from "react";
import { FileBarChart, Download, Users, Banknote, TrendingUp, Activity } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import StatCard from "../../components/common/StatCard";
import PerformanceChart from "../../components/charts/PerformanceChart";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/ui/Spinner";
import { adminService } from "../../services/admin";
import { useUIStore } from "../../store/ui.slice";
import { C, FONT, fmt, fmtCompact, fmtDateShort } from "../../theme";
import { exportCSV, exportJSON } from "../../services/reports";

type Range = "7d" | "30d" | "90d";

export default function AdminReports() {
  const toast = useUIStore((s) => s.toast);
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([adminService.getChartData(range), adminService.getStats()]).then(([d, s]) => {
      setData(d);
      setStats(s);
      setLoading(false);
    });
  }, [range]);

  const exportReport = () => {
    exportCSV(
      "reporte-administrativo-" + range,
      ["Fecha", "Usuarios nuevos", "Volumen USD", "Depósitos", "Retiros", "Operaciones"],
      data.map((d) => [d.date, d.users, d.volume, d.deposits, d.withdrawals, d.trades])
    );
    toast("success", "Reporte generado", "CSV descargado");
  };

  const totals = data.reduce(
    (acc, d) => ({
      users: acc.users + d.users,
      volume: acc.volume + d.volume,
      trades: acc.trades + d.trades,
      deposits: acc.deposits + d.deposits,
      withdrawals: acc.withdrawals + d.withdrawals,
    }),
    { users: 0, volume: 0, trades: 0, deposits: 0, withdrawals: 0 }
  );

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader
        title="Reportes Administrativos"
        subtitle="KPIs de negocio, crecimiento y operación para la toma de decisiones"
        icon={<FileBarChart size={19} color={C.purple} />}
        actions={
          <>
            <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={exportReport}>Exportar CSV</Button>
            <Button variant="outline" size="sm" onClick={() => { exportJSON("reporte-administrativo", { range, totals, data }); toast("success", "JSON exportado"); }}>JSON</Button>
          </>
        }
      />

      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {(["7d", "30d", "90d"] as Range[]).map((r) => (
          <button key={r} onClick={() => setRange(r)} style={{ padding: "5px 14px", fontSize: 11, fontWeight: range === r ? 700 : 400, borderRadius: 6, backgroundColor: range === r ? C.gold : C.card, color: range === r ? C.bg : C.t2, border: "1px solid " + (range === r ? C.gold : C.border), cursor: "pointer", fontFamily: FONT }}>
            {r === "7d" ? "7 días" : r === "30d" ? "30 días" : "90 días"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 70 }}><Spinner size={30} label="Generando reporte administrativo..." /></div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 10, marginBottom: 14 }}>
            <StatCard label="Usuarios nuevos" value={totals.users.toLocaleString()} icon={<Users size={14} color={C.blue} />} color={C.blue} />
            <StatCard label="Volumen total" value={fmtCompact(totals.volume)} icon={<TrendingUp size={14} color={C.purple} />} color={C.purple} />
            <StatCard label="Operaciones" value={totals.trades.toLocaleString()} icon={<Activity size={14} color={C.green} />} color={C.green} />
            <StatCard label="Depósitos" value={fmtCompact(totals.deposits)} icon={<Banknote size={14} color={C.green} />} color={C.green} />
            <StatCard label="Retiros" value={fmtCompact(totals.withdrawals)} icon={<Banknote size={14} color={C.red} />} color={C.red} />
          </div>

          <Card title={`Volumen de trading · ${range.toUpperCase()}`} subtitle="USD por día">
            <PerformanceChart data={data.map((d) => ({ date: fmtDateShort(d.date), "Volumen (USD)": d.volume }))} color={C.purple} height={260} gradientId="admVol2" />
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
            <Card title="Nuevos usuarios por día">
              <PerformanceChart data={data.map((d) => ({ date: fmtDateShort(d.date), Usuarios: d.users }))} dataKey="Usuarios" color={C.blue} height={210} gradientId="admUsers" />
            </Card>
            <Card title="Depósitos vs Retiros (USD)">
              <PerformanceChart data={data.map((d) => ({ date: fmtDateShort(d.date), Depósitos: d.deposits }))} dataKey="Depósitos" color={C.green} height={210} gradientId="admTx" />
              <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 10, color: C.t3 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: C.green }} /> Depósitos</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: C.red }} /> Retiros</span>
              </div>
            </Card>
          </div>

          {stats && (
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, backgroundColor: C.bg2, border: "1px solid " + C.border }}>
              <Badge tone="green">Sistema operativo</Badge>
              <span style={{ fontSize: 10, color: C.t2 }}>
                {stats.activeUsers24h.toLocaleString()} usuarios activos en 24h · {fmtCompact(stats.totalVolumeUsd30d * 0.001)} comisiones acumuladas (30d) · respuesta media {stats.avgResponseMs}ms
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
