/* Tarjeta de métrica (KPI) — BANCA NEN */
import { type ReactNode } from "react";
import { C, FONT } from "../../theme";

interface Props {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  color?: string;
  trend?: number; // % positivo/negativo
  loading?: boolean;
}

export default function StatCard({ label, value, sub, icon, color = C.blue, trend, loading }: Props) {
  return (
    <div style={{ backgroundColor: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: 14, fontFamily: FONT, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</span>
        {icon && (
          <span style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: color + "1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {icon}
          </span>
        )}
      </div>
      {loading ? (
        <div style={{ height: 22, width: "60%", borderRadius: 4, backgroundColor: C.border + "66", animation: "pulse 1.2s infinite" }} />
      ) : (
        <div style={{ fontSize: 19, fontWeight: 700, color: C.t1, letterSpacing: -0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 10 }}>
        {trend !== undefined && (
          <span style={{ fontWeight: 700, color: trend >= 0 ? C.green : C.red }}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        {sub && <span style={{ color: C.t3 }}>{sub}</span>}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
    </div>
  );
}
