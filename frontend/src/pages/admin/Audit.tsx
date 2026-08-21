/* Auditoría Inmutable (admin) — BANCA NEN */
import { useEffect, useMemo, useState } from "react";
import { ScrollText, ShieldAlert, Link2, Eye, Download } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import SearchBar from "../../components/common/SearchBar";
import Table, { type Column } from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Spinner from "../../components/ui/Spinner";
import { adminService, type AuditLog } from "../../services/admin";
import { useUIStore } from "../../store/ui.slice";
import { useDebounce } from "../../hooks/useDebounce";
import { C, FONT, fmtDate, timeAgo } from "../../theme";
import { exportCSV } from "../../services/reports";

const SEVERITY_TONE: Record<string, "blue" | "gold" | "red"> = {
  info: "blue", warning: "gold", danger: "red",
};

const ACTION_LABELS: Record<string, string> = {
  login: "Inicio de sesión",
  login_failed: "Login fallido",
  logout: "Cierre de sesión",
  register: "Registro de cuenta",
  password_change: "Cambio de contraseña",
  two_factor_enabled: "2FA activado",
  two_factor_disabled: "2FA desactivado",
  deposit: "Depósito",
  withdrawal: "Retiro",
  transfer: "Transferencia",
  order_created: "Crear orden",
  order_cancelled: "Cancelar orden",
  order_filled: "Ejecutar orden",
  kyc_verified: "KYC verificado",
  account_blocked: "Bloqueo de cuenta",
  account_unlocked: "Desbloqueo de cuenta",
  settings_changed: "Cambio de configuración",
  fraud_detected: "Fraude detectado",
  admin_action: "Acción administrativa",
};

export default function Audit() {
  const toast = useUIStore((s) => s.toast);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const debouncedQ = useDebounce(q, 300);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  useEffect(() => {
    setLoading(true);
    adminService.getAuditLogs({ search: debouncedQ || undefined, category, severity }).then((data) => {
      setLogs(data);
      setLoading(false);
    });
  }, [debouncedQ, category, severity]);

  const categories = useMemo(() => Array.from(new Set(logs.map((l) => l.category))), [logs]);

  const columns: Column<AuditLog>[] = [
    {
      key: "time", header: "Fecha", sortable: true, sortValue: (l) => l.createdAt,
      render: (l) => (
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.t1 }}>{timeAgo(l.createdAt)}</div>
          <div style={{ fontSize: 8, color: C.t3 }}>{fmtDate(l.createdAt)}</div>
        </div>
      ),
    },
    {
      key: "action", header: "Acción", sortable: true, sortValue: (l) => l.action,
      render: (l) => (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.t1 }}>{ACTION_LABELS[l.action] || l.action}</div>
          <div style={{ fontSize: 8, color: C.t3 }}>{l.category}</div>
        </div>
      ),
    },
    {
      key: "actor", header: "Actor", sortable: true, sortValue: (l) => l.actor,
      render: (l) => (
        <div style={{ maxWidth: 220 }}>
          <div style={{ fontSize: 10, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.actor}</div>
          <div style={{ fontSize: 8, color: C.t3 }}>{l.ip}</div>
        </div>
      ),
    },
    {
      key: "severity", header: "Severidad", sortable: true, sortValue: (l) => l.severity,
      render: (l) => <Badge tone={SEVERITY_TONE[l.severity] || "info"}>{l.severity.toUpperCase()}</Badge>,
    },
    {
      key: "details", header: "Detalle", render: (l) => <span style={{ fontSize: 10, color: C.t2 }}>{l.details}</span>,
    },
    {
      key: "hash", header: "Hash", render: (l) => (
        <span style={{ fontFamily: "monospace", fontSize: 8, color: C.t3 }} title={l.hash}>
          {l.hash.slice(0, 10)}…
        </span>
      ),
    },
    {
      key: "actions", header: "", align: "right",
      render: (l) => (
        <button onClick={() => setSelected(l)} style={{ background: "none", border: "none", cursor: "pointer", color: C.t2, display: "inline-flex", padding: 4 }}>
          <Eye size={13} />
        </button>
      ),
    },
  ];

  const handleExport = () => {
    exportCSV(
      "auditoria-banca-nen",
      ["Fecha", "Acción", "Categoría", "Actor", "IP", "Severidad", "Detalle", "Hash", "Hash previo"],
      logs.map((l) => [l.createdAt, ACTION_LABELS[l.action] || l.action, l.category, l.actor, l.ip, l.severity, l.details, l.hash, l.prevHash])
    );
    toast("success", "Exportación lista", "Auditoría descargada en CSV");
  };

  const selectSt: React.CSSProperties = {
    padding: "6px 10px", fontSize: 11, borderRadius: 6, backgroundColor: C.card,
    border: "1px solid " + C.border, color: C.t1, outline: "none", fontFamily: FONT, cursor: "pointer",
  };

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader
        title="Auditoría Inmutable"
        subtitle="Registro encadenado con hash de todas las acciones críticas (blockchain-like)"
        icon={<ScrollText size={19} color={C.gold} />}
        actions={<Button variant="outline" size="sm" icon={<Download size={13} />} onClick={handleExport}>Exportar CSV</Button>}
      />

      <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, backgroundColor: C.gold + "0D", border: "1px solid " + C.gold + "33", fontSize: 10, color: C.t2, display: "flex", alignItems: "center", gap: 8 }}>
        <Link2 size={13} color={C.gold} />
        Cada registro contiene el hash del registro anterior. Alterar un evento rompe la cadena y es detectado al instante.
      </div>

      <Card padded={false}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", borderBottom: "1px solid " + C.border, flexWrap: "wrap" }}>
          <SearchBar value={q} onChange={setQ} placeholder="Buscar acción, actor, detalle..." width={260} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectSt}>
            <option value="all">Todas las categorías</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={selectSt}>
            <option value="all">Todas las severidades</option>
            <option value="info">Info</option>
            <option value="warning">Advertencia</option>
            <option value="danger">Crítico</option>
          </select>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: C.t3 }}>{logs.length} eventos</span>
        </div>

        {loading ? (
          <Spinner label="Cargando auditoría..." />
        ) : (
          <Table columns={columns} data={logs} rowKey={(l) => l.id} pageSize={12} />
        )}
      </Card>

      {/* Modal detalle */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Evento de auditoría" subtitle="Registro inmutable con hash encadenado">
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge tone={SEVERITY_TONE[selected.severity] || "info"}>{selected.severity.toUpperCase()}</Badge>
              <Badge tone="blue">{selected.category}</Badge>
            </div>
            {[
              { label: "Acción", value: ACTION_LABELS[selected.action] || selected.action },
              { label: "Actor", value: selected.actor },
              { label: "Detalle", value: selected.details },
              { label: "IP", value: selected.ip },
              { label: "Fecha", value: fmtDate(selected.createdAt) },
            ].map((x) => (
              <div key={x.label} style={{ padding: "8px 10px", borderRadius: 7, backgroundColor: C.bg2, border: "1px solid " + C.border }}>
                <div style={{ fontSize: 9, color: C.t3 }}>{x.label}</div>
                <div style={{ fontSize: 11, color: C.t1, marginTop: 2, wordBreak: "break-word" }}>{x.value}</div>
              </div>
            ))}
            <div style={{ padding: "8px 10px", borderRadius: 7, backgroundColor: C.bg2, border: "1px solid " + C.border }}>
              <div style={{ fontSize: 9, color: C.t3 }}>Hash actual (SHA-256)</div>
              <div style={{ fontFamily: "monospace", fontSize: 9, color: C.green, marginTop: 3, wordBreak: "break-all" }}>{selected.hash}</div>
            </div>
            <div style={{ padding: "8px 10px", borderRadius: 7, backgroundColor: C.bg2, border: "1px solid " + C.border }}>
              <div style={{ fontSize: 9, color: C.t3 }}>Hash previo (encadenado)</div>
              <div style={{ fontFamily: "monospace", fontSize: 9, color: C.t2, marginTop: 3, wordBreak: "break-all" }}>{selected.prevHash}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
