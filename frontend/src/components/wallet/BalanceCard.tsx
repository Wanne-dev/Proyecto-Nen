/* Tarjeta de balance total — BANCA NEN */
import { Wallet } from "lucide-react";
import { C, FONT, fmt } from "../../theme";

interface Props {
  totalUsd: number;
  pnlPct?: number;
  loading?: boolean;
}

export default function BalanceCard({ totalUsd, pnlPct, loading }: Props) {
  const up = (pnlPct || 0) >= 0;
  return (
    <div
      style={{
        borderRadius: 14, padding: 20, fontFamily: FONT, position: "relative", overflow: "hidden",
        backgroundColor: C.card, border: "1px solid " + C.border,
      }}
    >
      <div
        style={{
          position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%",
          backgroundColor: C.gold + "0D",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: C.gold + "1F", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Wallet size={16} color={C.gold} />
        </span>
        <div>
          <div style={{ fontSize: 10, color: C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Balance total</div>
          <div style={{ fontSize: 9, color: C.t3 }}>Multi-moneda estandarizado en USD</div>
        </div>
      </div>
      {loading ? (
        <div style={{ height: 34, width: 180, borderRadius: 6, backgroundColor: C.border + "66" }} />
      ) : (
        <div style={{ fontSize: 34, fontWeight: 800, color: C.t1, letterSpacing: -1 }}>{fmt(totalUsd)}</div>
      )}
      {pnlPct !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 11 }}>
          <span style={{ fontWeight: 700, color: up ? C.green : C.red }}>
            {up ? "▲" : "▼"} {Math.abs(pnlPct).toFixed(2)}%
          </span>
          <span style={{ color: C.t3 }}>en los últimos 30 días</span>
        </div>
      )}
    </div>
  );
}
