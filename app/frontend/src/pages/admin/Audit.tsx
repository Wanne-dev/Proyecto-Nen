/* Auditoría verificable — BANCA NEN */
import { useEffect, useState } from "react";
import { ScrollText, Link2, Eye, Download } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import SearchBar from "../../components/common/SearchBar";
import Table, { type Column } from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Spinner from "../../components/ui/Spinner";
import { adminService, type AuditLog, type AuditIntegrity } from "../../services/admin";
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
  account_verified: "Cuenta verificada",
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

  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [integrity, setIntegrity] = useState<AuditIntegrity | null>(null);
  const [integrityError, setIntegrityError] = useState("");
  const [checking, setChecking] = useState(false);
  const categories = ["authentication", "user", "session", "wallet", "order", "system"];
  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError("");
    adminService.getAuditLogs({ search: debouncedQ || undefined, category, severity })
      .then((data) => { if (active) { setLogs(data.logs); setTotal(data.total); } })
      .catch((error: Error) => { if (active) setLoadError(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [debouncedQ, category, severity]);

  async function check() {
    setChecking(true); setIntegrity(null); setIntegrityError("");
    try { setIntegrity(await adminService.getAuditIntegrity()); }
    catch (cause) { setIntegrityError(cause instanceof Error ? cause.message : "No se pudo verificar la auditoría"); }
    finally { setChecking(false); }
  }

  const columns: Column<AuditLog>[] = [
    {
      key: "time", header: "Fecha", sortable: true, sortValue: (l) => l.createdAt,
      render: (l) => (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.t1 }}>{timeAgo(l.createdAt)}</div>
          <div style={{ fontSize: 10, color: C.t3 }}>{fmtDate(l.createdAt)}</div>
        </div>
      ),
    },
    {
      key: "action", header: "Acción", sortable: true, sortValue: (l) => l.action,
      render: (l) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{ACTION_LABELS[l.action] || l.action}</div>
          <div style={{ fontSize: 10, color: C.t3 }}>{l.category}</div>
        </div>
      ),
    },
    {
      key: "actor", header: "Actor", sortable: true, sortValue: (l) => l.actor,
      render: (l) => (
        <div style={{ maxWidth: 220 }}>
          <div style={{ fontSize: 12, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.actor}</div>
          <div style={{ fontSize: 10, color: C.t3 }}>{l.ip}</div>
        </div>
      ),
    },
    {
      key: "severity", header: "Severidad", sortable: true, sortValue: (l) => l.severity,
      render: (l) => <Badge tone={SEVERITY_TONE[l.severity] || "blue"}>{l.severity.toUpperCase()}</Badge>,
    },
    {
      key: "details", header: "Detalle", render: (l) => <span style={{ fontSize: 12, color: C.t2 }}>{l.details}</span>,
    },
    {
      key: "hash", header: "Hash", render: (l) => (
        <span style={{ fontFamily: "monospace", fontSize: 10, color: C.t3 }} title={l.hash}>
          {l.chainPosition ? `${l.hash.slice(0, 10)}…` : "Histórico"}
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
    padding: "6px 10px", fontSize: 13, borderRadius: 6, backgroundColor: C.card,
    border: "1px solid " + C.border, color: C.t1, outline: "none", fontFamily: FONT, cursor: "pointer",
  };

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader
        title="Auditoría"
        subtitle="Registro de operaciones y cambios sensibles"
        icon={<ScrollText size={19} color={C.gold} />}
        actions={<Button variant="outline" size="sm" icon={<Download size={13} />} onClick={handleExport} disabled={loading || !!loadError || !logs.length}>Exportar visibles</Button>}
      />

      <div style={{ marginBottom: 14 }}>
        <Card title="Integridad de la cadena" subtitle="La comprobación cubre los eventos nuevos. Los históricos quedan fuera de la cadena.">
          <p style={{ color: C.t2, fontSize: 12, marginBottom: 10 }}>Los eventos nuevos enlazan hashes SHA-256 y la base impide editar o borrar filas en uso normal. No es un registro externo ni garantiza inmutabilidad frente a un administrador de base de datos.</p>
          <Button variant="outline" icon={<Link2 size={13} />} disabled={checking} onClick={() => void check()}>{checking ? "Comprobando…" : "Comprobar cadena"}</Button>
          {integrityError && <p role="alert" style={{ color: C.red, marginTop: 10 }}>{integrityError}</p>}
          {integrity && <p role="status" style={{ color: integrity.valid ? C.green : C.red, marginTop: 10 }}>
            {integrity.valid ? integrity.checked ? `Cadena válida: ${integrity.checked} eventos comprobados.` : "No hay eventos nuevos que comprobar." : `La cadena no coincide a partir de la posición ${integrity.firstInvalid}.`}
            {` ${integrity.legacy} eventos históricos no verificables.`}
          </p>}
        </Card>
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
          <span style={{ fontSize: 12, color: C.t3 }}>{logs.length} de {total} eventos</span>
        </div>

        {loading ? (
          <Spinner label="Cargando auditoría..." />
        ) : loadError ? (
          <p role="alert" style={{ color: C.red, padding: 14 }}>{loadError}</p>
        ) : (
          <Table columns={columns} data={logs} rowKey={(l) => l.id} pageSize={12} />
        )}
      </Card>

      {/* Modal detalle */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Evento de auditoría" subtitle={selected?.chainPosition ? `Posición ${selected.chainPosition} en la cadena` : "Evento histórico no verificable"}>
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge tone={SEVERITY_TONE[selected.severity] || "blue"}>{selected.severity.toUpperCase()}</Badge>
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
                <div style={{ fontSize: 11, color: C.t3 }}>{x.label}</div>
                <div style={{ fontSize: 13, color: C.t1, marginTop: 2, wordBreak: "break-word" }}>{x.value}</div>
              </div>
            ))}
            <div style={{ padding: "8px 10px", borderRadius: 7, backgroundColor: C.bg2, border: "1px solid " + C.border }}>
              <div style={{ fontSize: 11, color: C.t3 }}>Hash actual (SHA-256)</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: C.green, marginTop: 3, wordBreak: "break-all" }}>{selected.hash}</div>
            </div>
            <div style={{ padding: "8px 10px", borderRadius: 7, backgroundColor: C.bg2, border: "1px solid " + C.border }}>
              <div style={{ fontSize: 11, color: C.t3 }}>Hash previo (encadenado)</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: C.t2, marginTop: 3, wordBreak: "break-all" }}>{selected.prevHash}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
