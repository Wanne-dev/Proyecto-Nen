import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Users, TrendingUp, ShieldAlert, Wallet } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import StatCard from "../../components/common/StatCard";
import Button from "../../components/ui/Button";
import PerformanceChart from "../../components/charts/PerformanceChart";
import Spinner from "../../components/ui/Spinner";
import { adminService, type AdminStats, type AdminDay } from "../../services/admin";
import { useAuthStore } from "../../store/auth.slice";
import { canAccessStaffSection } from "../../types/User.types";
import { C, fmtCompact } from "../../theme";

export default function Admin() {
  const role = useAuthStore((s) => s.user?.role);
  const [data, setData] = useState<{ stats: AdminStats; chart: AdminDay[] } | null>(null);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    Promise.all([adminService.getStats(), adminService.getChartData(range)])
      .then(([stats, chart]) => { if (active) setData({ stats, chart }); })
      .catch((cause: Error) => { if (active) setError(cause.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range]);
  const stats = data?.stats;
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <PageHeader title="Panel de control" subtitle="Métricas de cuentas y movimientos virtuales, calculadas desde PostgreSQL" icon={<Activity size={19} color={C.gold} />} />
      {error ? <p role="alert" style={{ color: C.red }}>{error}</p> : loading || !stats ? <Spinner label="Cargando métricas…" /> : <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 10 }}>
          <StatCard label="Cuentas registradas" value={stats.totalUsers.toLocaleString()} icon={<Users size={14} color={C.blue} />} color={C.blue} />
          <StatCard label="Iniciaron sesión (24h)" value={stats.activeUsers24h.toLocaleString()} icon={<Activity size={14} color={C.green} />} color={C.green} />
          <StatCard label="Volumen virtual (30 días)" value={fmtCompact(stats.totalVolumeUsd30d)} icon={<TrendingUp size={14} color={C.purple} />} color={C.purple} />
          <StatCard label="Depósitos de hoy (UTC)" value={String(stats.depositsToday)} icon={<Wallet size={14} color={C.gold} />} color={C.gold} />
          <StatCard label="Cuentas bloqueadas" value={String(stats.blockedAccounts)} icon={<ShieldAlert size={14} color={C.red} />} color={C.red} />
        </div>
        <Card title="Actividad virtual" subtitle="Importe en USD por día (UTC), incluye depósitos, retiros y operaciones" action={
          <div style={{ display: "flex", gap: 5 }}>{(["7d", "30d", "90d"] as const).map((item) => <Button key={item} size="sm" variant={range === item ? "primary" : "outline"} onClick={() => setRange(item)}>{item}</Button>)}</div>
        }>
          <PerformanceChart data={(data?.chart || []).map((day) => ({ date: day.date, Volumen: day.volume }))} dataKey="Volumen" color={C.purple} height={260} gradientId="adminVol" />
        </Card>
      </>}
      {canAccessStaffSection(role, "audit") && <Link to="/admin/audit" style={{ color: C.green }}>Consultar auditoría →</Link>}
    </div>
  );
}
