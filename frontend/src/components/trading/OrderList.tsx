/* Lista de órdenes — BANCA NEN */
import { X } from "lucide-react";
import type { Order } from "../../services/orders";
import { C, FONT, fmt, fmtDateShort } from "../../theme";

const STATUS_COLOR: Record<string, string> = {
  filled: C.green, open: C.blue, partial: C.gold, cancelled: C.t3, pending: C.gold, rejected: C.red, expired: C.t3,
};

const TYPE_LABELS: Record<string, string> = {
  market: "Mercado", limit: "Límite", stop_loss: "Stop-Loss", take_profit: "Take-Profit",
  stop_limit: "Stop-Límite", trailing_stop: "Trailing", oco: "OCO",
};

export default function OrderList({ orders, onCancel }: { orders: Order[]; onCancel?: (id: string) => void }) {
  const openOrders = orders.filter((o) => ["open", "partial", "pending"].includes(o.status));
  const recent = orders.slice(0, 8);

  return (
    <div style={{ fontFamily: FONT, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Órdenes abiertas */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.t1, marginBottom: 8 }}>Órdenes abiertas ({openOrders.length})</div>
        {openOrders.length === 0 ? (
          <div style={{ padding: "14px 12px", textAlign: "center", color: C.t3, fontSize: 11, backgroundColor: C.card, borderRadius: 8, border: "1px dashed " + C.border }}>
            No tienes órdenes abiertas
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {openOrders.map((o) => (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", backgroundColor: C.card, borderRadius: 8, border: "1px solid " + C.border }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: (o.side === "buy" ? C.green : C.red) + "1A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: o.side === "buy" ? C.green : C.red }}>
                  {o.side === "buy" ? "C" : "V"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.t1 }}>
                    {o.asset.toUpperCase()} <span style={{ color: C.t3, fontWeight: 400 }}>· {TYPE_LABELS[o.type] || o.type}</span>
                  </div>
                  <div style={{ fontSize: 9, color: C.t3 }}>
                    {o.quantity} @ {fmt(o.price)}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 10 }}>
                  <div style={{ color: C.t2, fontWeight: 600 }}>{fmt(o.total)}</div>
                  <div style={{ color: STATUS_COLOR[o.status] || C.t2 }}>{o.status.toUpperCase()}</div>
                </div>
                {onCancel && (
                  <button onClick={() => onCancel(o.id)} title="Cancelar" style={{ background: "none", border: "none", cursor: "pointer", color: C.t3, display: "flex", padding: 4 }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recientes */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.t1, marginBottom: 8 }}>Últimas operaciones</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {recent.map((o, i) => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", borderBottom: i < recent.length - 1 ? "1px solid " + C.border : "none" }}>
              <span style={{ fontSize: 10, fontWeight: 600, width: 34, color: o.side === "buy" ? C.green : C.red }}>
                {o.side === "buy" ? "COMPRA" : "VENTA"}
              </span>
              <span style={{ fontSize: 10, flex: 1, color: C.t1 }}>{o.asset.toUpperCase()} · {o.quantity}</span>
              <span style={{ fontSize: 10, color: C.t2 }}>{fmt(o.price)}</span>
              <span style={{ fontSize: 10, color: STATUS_COLOR[o.status] || C.t2 }}>{o.status}</span>
              <span style={{ fontSize: 9, color: C.t3 }}>{fmtDateShort(o.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
