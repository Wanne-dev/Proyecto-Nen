/* Lista de órdenes — BANCA NEN (diseño ligero, lógica intacta) */
import { X } from "lucide-react";
import type { Order } from "../../services/orders";
import { fmt, fmtDateShort } from "../../theme";

const STATUS_COLOR: Record<string, string> = {
  filled: "#00d4aa", open: "#0a84ff", partial: "#f5a623", cancelled: "#6b6b80", pending: "#f5a623", rejected: "#ff4d5e", expired: "#6b6b80",
};

const TYPE_LABELS: Record<string, string> = {
  market: "Mercado", limit: "Límite", stop_loss: "Stop-Loss", take_profit: "Take-Profit",
  stop_limit: "Stop-Límite", trailing_stop: "Trailing", oco: "OCO",
};

export default function OrderList({ orders, onCancel }: { orders: Order[]; onCancel?: (id: string) => void }) {
  const openOrders = orders.filter((o) => ["open", "partial", "pending"].includes(o.status));
  const recent = orders.slice(0, 8);

  return (
    <div className="flex flex-col gap-6 text-white">
      {/* Órdenes abiertas */}
      <div>
        <div className="text-[13px] font-bold text-gray-200 mb-2">
          Órdenes abiertas <span className="text-gray-600">({openOrders.length})</span>
        </div>
        {openOrders.length === 0 ? (
          <div className="py-6 text-center text-gray-600 text-[13px] rounded-xl border border-dashed border-white/10">
            No tienes órdenes abiertas
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {openOrders.map((o) => (
              <div key={o.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-extrabold" style={{ backgroundColor: (o.side === "buy" ? "#00d4aa" : "#ff4d5e") + "1f", color: o.side === "buy" ? "#00d4aa" : "#ff4d5e" }}>
                  {o.side === "buy" ? "C" : "V"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-gray-100">
                    {o.asset.toUpperCase()} <span className="text-gray-500 font-normal">· {TYPE_LABELS[o.type] || o.type}</span>
                  </div>
                  <div className="text-[11px] text-gray-600">{o.quantity} @ {fmt(o.price)}</div>
                </div>
                <div className="text-right text-[12px]">
                  <div className="text-gray-300 font-semibold">{fmt(o.total)}</div>
                  <div style={{ color: STATUS_COLOR[o.status] || "#a0a0b8" }}>{o.status.toUpperCase()}</div>
                </div>
                {onCancel && (
                  <button onClick={() => onCancel(o.id)} title="Cancelar" className="text-gray-600 hover:text-gray-200 transition-colors p-1">
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
        <div className="text-[13px] font-bold text-gray-200 mb-2">Últimas operaciones</div>
        <div className="flex flex-col">
          {recent.map((o, i) => (
            <div key={o.id} className={`flex items-center gap-3 py-2 text-[12px] ${i < recent.length - 1 ? "border-b border-white/[0.04]" : ""}`}>
              <span className="w-12 font-bold" style={{ color: o.side === "buy" ? "#00d4aa" : "#ff4d5e" }}>
                {o.side === "buy" ? "COMPRA" : "VENTA"}
              </span>
              <span className="flex-1 text-gray-200">{o.asset.toUpperCase()} · {o.quantity}</span>
              <span className="text-gray-400">{fmt(o.price)}</span>
              <span style={{ color: STATUS_COLOR[o.status] || "#a0a0b8" }}>{o.status}</span>
              <span className="text-gray-600">{fmtDateShort(o.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}