/* Página de Historial de Órdenes — BANCA NEN */
import { useEffect, useMemo, useState } from "react";
import { History, Download, Filter, XCircle } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import SearchBar from "../../components/common/SearchBar";
import Table, { type Column } from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/common/EmptyState";
import { useTradingStore } from "../../store/trading.slice";
import { useUIStore } from "../../store/ui.slice";
import { useDebounce } from "../../hooks/useDebounce";
import { C, FONT, fmt, fmtDate } from "../../theme";
import { exportCSV } from "../../services/reports";
import type { Order } from "../../services/orders";

const TYPE_LABELS: Record<string, string> = {
  market: "Mercado", limit: "Límite", stop_loss: "Stop-Loss", take_profit: "Take-Profit",
  stop_limit: "Stop-Límite", trailing_stop: "Trailing Stop", oco: "OCO",
};

const STATUS_TONE: Record<string, "green" | "blue" | "gold" | "gray" | "red"> = {
  filled: "green", open: "blue", partial: "gold", pending: "gold", cancelled: "gray", rejected: "red", expired: "gray",
};

export default function OrderHistory() {
  const { orders, refreshOrders } = useTradingStore();
  const toast = useUIStore((s) => s.toast);
  const [q, setQ] = useState("");
  const [side, setSide] = useState("all");
  const [status, setStatus] = useState("all");
  const debouncedQ = useDebounce(q, 250);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchesQ = !debouncedQ ||
        o.asset.toLowerCase().includes(debouncedQ.toLowerCase()) ||
        o.reference.toLowerCase().includes(debouncedQ.toLowerCase());
      const matchesSide = side === "all" || o.side === side;
      const matchesStatus = status === "all" || o.status === status;
      return matchesQ && matchesSide && matchesStatus;
    });
  }, [orders, debouncedQ, side, status]);

  const columns: Column<Order>[] = [
    {
      key: "reference", header: "Referencia", sortable: true, sortValue: (o) => o.reference,
      render: (o) => (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.t1 }}>{o.reference}</div>
          <div style={{ fontSize: 9, color: C.t3 }}>{fmtDate(o.createdAt)}</div>
        </div>
      ),
    },
    {
      key: "side", header: "Lado", sortable: true, sortValue: (o) => o.side,
      render: (o) => (
        <Badge tone={o.side === "buy" ? "green" : "red"}>
          {o.side === "buy" ? "COMPRA" : "VENTA"}
        </Badge>
      ),
    },
    {
      key: "asset", header: "Activo", sortable: true, sortValue: (o) => o.asset,
      render: (o) => <span style={{ fontWeight: 700, fontSize: 11 }}>{o.asset.toUpperCase()}</span>,
    },
    {
      key: "type", header: "Tipo", sortable: true, sortValue: (o) => o.type,
      render: (o) => <span style={{ color: C.t2, fontSize: 10 }}>{TYPE_LABELS[o.type] || o.type}</span>,
    },
    {
      key: "quantity", header: "Cantidad", align: "right", sortable: true, sortValue: (o) => o.quantity,
      render: (o) => <span style={{ fontSize: 11 }}>{o.quantity}</span>,
    },
    {
      key: "price", header: "Precio", align: "right", sortable: true, sortValue: (o) => o.price,
      render: (o) => <span style={{ fontSize: 11 }}>{fmt(o.price)}</span>,
    },
    {
      key: "total", header: "Total", align: "right", sortable: true, sortValue: (o) => o.total,
      render: (o) => (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600 }}>{fmt(o.total)}</div>
          <div style={{ fontSize: 8, color: C.t3 }}>comisión {fmt(o.fee)}</div>
        </div>
      ),
    },
    {
      key: "score", header: "IA", align: "center", sortable: true, sortValue: (o) => o.score,
      render: (o) => (
        <span style={{ fontSize: 10, fontWeight: 800, color: o.score >= 65 ? C.green : o.score >= 45 ? C.gold : C.red }}>
          {o.score}
        </span>
      ),
    },
    {
      key: "status", header: "Estado", sortable: true, sortValue: (o) => o.status,
      render: (o) => <Badge tone={STATUS_TONE[o.status] || "gray"}>{o.status.toUpperCase()}</Badge>,
    },
    {
      key: "actions", header: "", align: "right",
      render: (o) => (
        ["open", "partial", "pending"].includes(o.status) ? (
          <button
            onClick={() => useTradingStore.getState().cancelOrder(o.id).then(() => toast("info", "Orden cancelada", o.reference))}
            title="Cancelar orden"
            style={{ background: "none", border: "none", cursor: "pointer", color: C.t3, display: "inline-flex", padding: 4 }}
          >
            <XCircle size={14} />
          </button>
        ) : null
      ),
    },
  ];

  const handleExport = () => {
    exportCSV(
      "ordenes-banca-nen",
      ["Referencia", "Lado", "Activo", "Tipo", "Cantidad", "Precio", "Total", "Comisión", "Score IA", "Estado", "Creada"],
      filtered.map((o) => [o.reference, o.side.toUpperCase(), o.asset, TYPE_LABELS[o.type] || o.type, o.quantity, o.price, o.total, o.fee, o.score, o.status, o.createdAt])
    );
    toast("success", "Exportación lista", "CSV descargado");
  };

  const selectSt: React.CSSProperties = {
    padding: "6px 10px", fontSize: 11, borderRadius: 6, backgroundColor: C.card,
    border: "1px solid " + C.border, color: C.t1, outline: "none", fontFamily: FONT, cursor: "pointer",
  };

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader
        title="Historial de Órdenes"
        subtitle="Todas tus operaciones de compra y venta con filtros, score IA y exportación"
        icon={<History size={19} color={C.blue} />}
        actions={
          <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={handleExport}>
            Exportar CSV
          </Button>
        }
      />

      <Card padded={false}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", borderBottom: "1px solid " + C.border, flexWrap: "wrap" }}>
          <SearchBar value={q} onChange={setQ} placeholder="Buscar activo o referencia..." width={230} />
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Filter size={12} color={C.t3} />
            <select value={side} onChange={(e) => setSide(e.target.value)} style={selectSt}>
              <option value="all">Todos los lados</option>
              <option value="buy">Compra</option>
              <option value="sell">Venta</option>
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectSt}>
              <option value="all">Todos los estados</option>
              <option value="filled">Completadas</option>
              <option value="open">Abiertas</option>
              <option value="partial">Parciales</option>
              <option value="cancelled">Canceladas</option>
              <option value="rejected">Rechazadas</option>
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: C.t3 }}>{filtered.length} órdenes</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="Sin órdenes" message="No hay órdenes que coincidan con los filtros. Realiza tu primera operación desde Trading." />
        ) : (
          <Table columns={columns} data={filtered} rowKey={(o) => o.id} pageSize={10} />
        )}
      </Card>
    </div>
  );
}
