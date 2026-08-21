/* Panel de Administración (overview) — BANCA NEN */
import { useEffect, useState } from "react";
import { Users, Wallet, TrendingUp, ShieldAlert, Activity, Clock, AlertTriangle, CheckCircle2, Banknote } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import StatCard from "../../components/common/StatCard";
import Badge from "../../components/ui/Badge";
import PerformanceChart from "../../components/charts/PerformanceChart";
import Spinner from "../../components/ui/Spinner";
import { adminService } from "../../services/admin";
import { C, FONT, fmt, fmtCompact, fmtDate, timeAgo } from "../../theme";

export default function Admin() {
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([adminService.getStats(), adminService.getChartData(range)]).then(([s, c]) => {
      setStats(s);
      setChartData(c);
      setLoading(false);
    });
  }, [range]);

  const healthItems = [
    { label: "API backend", status: "Operativa", ok: true, value: stats?.avgResponseMs + "ms" },
    { label: "Base de datos PostgreSQL", status: "Operativa", ok: true, value: "99.99% uptime" },
    { label: "Redis / caché", status: "Operativa", ok: true, value: "1.2ms" },
    { label: "Servicio IA (FastAPI)", status: "Operativa", ok: true, value: stats?.avgResponseMs + "ms" },
    { label: "WebSocket tiempo real", status: "Operativa", ok: true, value: "4.1k conexiones" },
    { label: "Wompi (pasarela)", status: "Operativa", ok: true, value: "PCI DSS" },
  ];

  const recentActivity = [
    { type: "Seguridad", text: "Bloqueo automático de cuenta usr-1104 por actividad sospechosa (SARLAFT)", time: new Date(Date.now() - 3600000 * 2).toISOString(), severity: "danger" },
    { type: "KYC", text: "Aprobada verificación KYC nivel 2 de María Gómez", time: new Date(Date.now() - 3600000 * 3).toISOString(), severity: "success" },
    { type: "Trading", text: "Pico de volumen: $842K en las últimas 2 horas", time: new Date(Date.now() - 3600000 * 4).toISOString(), severity: "info" },
    { type: "Sistema", text: "Entrenamiento diario del modelo IA completado (accuracy 78.3%)", time: new Date(Date.now() - 3600000 * 6).toISOString(), severity: "success" },
    { type: "Finanzas", text: "Concialiación de depósitos Wompi completada", time: new Date(Date.now() - 3600000 * 8).toISOString(), severity: "info" },
  ];

  const sevMeta: Record<string, { color: string; icon: any }> = {
    danger: { color: C.red, icon: AlertTriangle },
    success: { color: C.green, icon: CheckCircle2 },
    info: { color: C.blue, icon: Activity },
  };

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader
        title="Panel de Control"
        subtitle="Métricas globales de la plataforma BANCA NEN en tiempo real"
        icon={<Activity size={19} color={C.gold} />}
        actions={<Badge tone="green" icon={<span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: C.green }} />}>Sistema operativo · {stats?.uptime || 99.98}% uptime</Badge>}
      />

      {loading || !stats ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 70 }}><Spinner size={30} label="Cargando métricas..." /></div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 10, marginBottom: 14 }}>
            <StatCard label="Usuarios totales" value={stats.totalUsers.toLocaleString()} trend={12.4} sub="+5.2% este mes" icon={<Users size={14} color={C.blue} />} color={C.blue} />
            <StatCard label="Usuarios activos (24h)" value={stats.activeUsers24h.toLocaleString()} trend={8.1} sub="de 5 países" icon={<Activity size={14} color={C.green} />} color={C.green} />
            <StatCard label="Volumen de trading" value={fmtCompact(stats.totalVolumeUsd30d)} trend={14.9} sub="acumulado 30 días" icon={<TrendingUp size={14} color={C.purple} />} color={C.purple} />
            <StatCard label="Comisiones generadas" value={fmt(stats.totalVolumeUsd30d * 0.001, 0)} trend={9.4} sub="30 días" icon={<Banknote size={14} color={C.gold} />} color={C.gold} />
            <StatCard label="Alertas de fraude (24h)" value={stats.blockedAccounts} trend={-18} sub="detección SARLAFT" icon={<ShieldAlert size={14} color={C.red} />} color={C.red} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, alignItems: "start" }}>
            {/* Gráfico */}
            <Card
              title="Actividad de la plataforma"
              subtitle="Usuarios nuevos, volumen y operaciones por día"
              action={
                <div style={{ display: "flex", gap: 4 }}>
                  {(["7d", "30d", "90d"] as const).map((r) => (
                    <button key={r} onClick={() => setRange(r)} style={{ padding: "3px 10px", fontSize: 9, borderRadius: 4, backgroundColor: range === r ? C.gold : C.card, color: range === r ? C.bg : C.t2, border: "1px solid " + (range === r ? C.gold : C.border), cursor: "pointer", fontFamily: FONT, fontWeight: 600 }}>
                      {r.toUpperCase()}
                    </button>
                  ))}
                </div>
              }
            >
              <PerformanceChart data={chartData.map((d) => ({ date: d.date, "Volumen (USD)": d.volume }))} dataKey="Volumen (USD)" color={C.purple} height={260} gradientId="adminVol" />
              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                {[
                  { label: "Depósitos (hoy)", value: stats.depositsToday, color: C.green },
                  { label: "Transacciones", value: stats.totalTransactions, color: C.red },
                  { label: "Órdenes abiertas", value: stats.openOrders, color: C.blue },
                  { label: "KYC pendientes", value: stats.pendingKyc, color: C.gold },
                  { label: "Cuentas bloqueadas", value: stats.blockedAccounts, color: C.red },
                ].map((x) => (
                  <div key={x.label} style={{ padding: "9px 11px", borderRadius: 8, backgroundColor: C.bg2, border: "1px solid " + C.border }}>
                    <div style={{ fontSize: 9, color: C.t3 }}>{x.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: x.color }}>{x.value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Salud */}
            <Card title="Salud del sistema" subtitle="Monitoreo en vivo de servicios">
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {healthItems.map((h) => (
                  <div key={h.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 7, backgroundColor: C.bg2, border: "1px solid " + C.border }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: h.ok ? C.green : C.red, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: C.t1 }}>{h.label}</div>
                      <div style={{ fontSize: 8, color: C.t3 }}>{h.status}</div>
                    </div>
                    <span style={{ fontSize: 9, color: C.t3 }}>{h.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Actividad reciente */}
          <div style={{ marginTop: 14 }}>
            <Card title="Actividad reciente" subtitle="Eventos relevantes de la plataforma" padded={false}>
              {recentActivity.map((a, i) => {
                const m = sevMeta[a.severity] || sevMeta.info;
                const Icon = m.icon;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", borderBottom: i < recentActivity.length - 1 ? "1px solid " + C.border : "none" }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: m.color + "1A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={13} color={m.color} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: C.t1 }}>{a.text}</div>
                      <div style={{ fontSize: 9, color: C.t3, marginTop: 1 }}>{a.type}</div>
                    </div>
                    <span style={{ fontSize: 9, color: C.t3, whiteSpace: "nowrap" }}>{timeAgo(a.time)}</span>
                  </div>
                );
              })}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
