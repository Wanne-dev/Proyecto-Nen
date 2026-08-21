/* Gestión de Usuarios (admin) — BANCA NEN */
import { useEffect, useMemo, useState } from "react";
import { Users as UsersIcon, ShieldCheck, ShieldOff, UserCog, Download, Eye, BadgeCheck } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import SearchBar from "../../components/common/SearchBar";
import Table, { type Column } from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import EmptyState from "../../components/common/EmptyState";
import Spinner from "../../components/ui/Spinner";
import { adminService, type AdminUser } from "../../services/admin";
import { useUIStore } from "../../store/ui.slice";
import { useDebounce } from "../../hooks/useDebounce";
import { C, FONT, fmt, fmtDateShort, timeAgo } from "../../theme";
import { exportCSV } from "../../services/reports";

const ROLE_TONE: Record<string, "purple" | "blue" | "gold" | "green"> = {
  admin: "purple", operator: "blue", analyst: "gold", user: "green",
};

const STATUS_TONE: Record<string, "green" | "red" | "gold" | "gray"> = {
  active: "green", blocked: "red", suspended: "gold", pending: "gold", deleted: "gray",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador", operator: "Operador", analyst: "Analista", user: "Usuario",
};

export default function Users() {
  const toast = useUIStore((s) => s.toast);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const debouncedQ = useDebounce(q, 300);
  const [selected, setSelected] = useState<AdminUser | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await adminService.getUsers({ search: debouncedQ || undefined, role, status });
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [debouncedQ, role, status]);

  const changeStatus = async (u: AdminUser, newStatus: string) => {
    await adminService.updateUserStatus(u.id, newStatus);
    setUsers(users.map((x) => (x.id === u.id ? { ...x, status: newStatus } : x)));
    toast(newStatus === "active" ? "success" : "warning", `Usuario ${newStatus === "active" ? "activado" : "bloqueado"}`, u.email);
  };

  const changeRole = async (u: AdminUser, newRole: string) => {
    await adminService.updateUserRole(u.id, newRole);
    setUsers(users.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
    toast("success", "Rol actualizado", `${u.email} ahora es ${ROLE_LABELS[newRole]}`);
  };

  const handleExport = () => {
    exportCSV(
      "usuarios-banca-nen",
      ["Nombre", "Email", "Rol", "Estado", "KYC", "País", "Balance USD", "Operaciones", "Creado", "Último acceso"],
      users.map((u) => [u.firstName + " " + u.lastName, u.email, ROLE_LABELS[u.role] || u.role, u.accountStatus, u.kycStatus, u.country, u.balanceUsd, u.tradesCount, u.createdAt, u.lastLoginAt || ""])
    );
    toast("success", "Exportación lista", "CSV descargado");
  };

  const columns: Column<AdminUser>[] = [
    {
      key: "user", header: "Usuario", sortable: true, sortValue: (u) => u.firstName,
      render: (u) => (
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: (u.accountStatus === "active" ? C.blue : C.border) + "33", color: u.accountStatus === "active" ? C.blue : C.t3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
            {(u.firstName[0] + u.lastName[0]).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.t1, whiteSpace: "nowrap" }}>{u.firstName} {u.lastName}</div>
            <div style={{ fontSize: 9, color: C.t3 }}>{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role", header: "Rol", sortable: true, sortValue: (u) => u.role,
      render: (u) => <Badge tone={ROLE_TONE[u.role] || "green"}>{ROLE_LABELS[u.role] || u.role}</Badge>,
    },
    {
      key: "status", header: "Estado", sortable: true, sortValue: (u) => u.accountStatus,
      render: (u) => <Badge tone={STATUS_TONE[u.accountStatus] || "gray"}>{u.accountStatus.toUpperCase()}</Badge>,
    },
    {
      key: "kyc", header: "KYC", sortable: true, sortValue: (u) => u.kycStatus,
      render: (u) => (
        <Badge tone={u.kycStatus === "verified" ? "green" : u.kycStatus === "rejected" ? "red" : "gold"}>
          {u.kycStatus.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "country", header: "País", sortable: true, sortValue: (u) => u.country,
      render: (u) => <span style={{ fontSize: 10, color: C.t2 }}>{u.country}</span>,
    },
    {
      key: "balance", header: "Balance", align: "right", sortable: true, sortValue: (u) => u.balanceUsd,
      render: (u) => <span style={{ fontSize: 11, fontWeight: 600 }}>{fmt(u.balanceUsd)}</span>,
    },
    {
      key: "trades", header: "Ops", align: "right", sortable: true, sortValue: (u) => u.tradesCount,
      render: (u) => <span style={{ fontSize: 10, color: C.t2 }}>{u.tradesCount}</span>,
    },
    {
      key: "lastLogin", header: "Último acceso", sortable: true, sortValue: (u) => u.lastLoginAt || "",
      render: (u) => <span style={{ fontSize: 9, color: C.t3 }}>{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Nunca"}</span>,
    },
    {
      key: "actions", header: "", align: "right",
      render: (u) => (
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
          <button onClick={() => setSelected(u)} title="Ver detalle" style={{ background: "none", border: "none", cursor: "pointer", color: C.t2, display: "inline-flex", padding: 4 }}>
            <Eye size={13} />
          </button>
          <select
            value={u.accountStatus}
            onChange={(e) => changeStatus(u, e.target.value)}
            style={{ padding: "3px 6px", fontSize: 9, borderRadius: 5, backgroundColor: C.card, border: "1px solid " + C.border, color: C.t1, outline: "none", fontFamily: FONT, cursor: "pointer" }}
            title="Cambiar estado"
          >
            <option value="active">Activar</option>
            <option value="blocked">Bloquear</option>
            <option value="suspended">Suspender</option>
          </select>
        </div>
      ),
    },
  ];

  const selectSt: React.CSSProperties = {
    padding: "6px 10px", fontSize: 11, borderRadius: 6, backgroundColor: C.card,
    border: "1px solid " + C.border, color: C.t1, outline: "none", fontFamily: FONT, cursor: "pointer",
  };

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader
        title="Gestión de Usuarios"
        subtitle="Roles (Admin, Operador, Analista, Usuario), estados y verificación KYC"
        icon={<UsersIcon size={19} color={C.blue} />}
        actions={<Button variant="outline" size="sm" icon={<Download size={13} />} onClick={handleExport}>Exportar CSV</Button>}
      />

      <Card padded={false}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "12px 14px", borderBottom: "1px solid " + C.border, flexWrap: "wrap" }}>
          <SearchBar value={q} onChange={setQ} placeholder="Buscar nombre, email..." width={240} />
          <select value={role} onChange={(e) => setRole(e.target.value)} style={selectSt}>
            <option value="all">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="operator">Operador</option>
            <option value="analyst">Analista</option>
            <option value="user">Usuario</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectSt}>
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="blocked">Bloqueados</option>
            <option value="pending">Pendientes</option>
            <option value="suspended">Suspendidos</option>
          </select>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: C.t3 }}>{users.length} usuarios</span>
        </div>

        {loading ? (
          <Spinner label="Cargando usuarios..." />
        ) : users.length === 0 ? (
          <EmptyState title="Sin resultados" message="Ningún usuario coincide con los filtros" />
        ) : (
          <Table columns={columns} data={users} rowKey={(u) => u.id} pageSize={9} />
        )}
      </Card>

      {/* Modal detalle */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalle del usuario" subtitle={selected?.email}>
        {selected && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: C.blue + "33", color: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800 }}>
                {(selected.firstName[0] + selected.lastName[0]).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.t1 }}>{selected.firstName} {selected.lastName}</div>
                <div style={{ fontSize: 10, color: C.t3 }}>{selected.email}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                  <Badge tone={ROLE_TONE[selected.role]}>{ROLE_LABELS[selected.role]}</Badge>
                  <Badge tone={STATUS_TONE[selected.accountStatus]}>{selected.accountStatus.toUpperCase()}</Badge>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "País", value: selected.country },
                { label: "KYC", value: selected.kycStatus.toUpperCase() },
                { label: "Balance USD", value: fmt(selected.balanceUsd) },
                { label: "Operaciones", value: String(selected.tradesCount) },
                { label: "Registrado", value: fmtDateShort(selected.createdAt) },
                { label: "2FA", value: selected.twoFactorEnabled ? "Activado" : "Inactivo" },
              ].map((x) => (
                <div key={x.label} style={{ padding: "8px 10px", borderRadius: 7, backgroundColor: C.bg2, border: "1px solid " + C.border }}>
                  <div style={{ fontSize: 9, color: C.t3 }}>{x.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.t1, marginTop: 2 }}>{x.value}</div>
                </div>
              ))}
            </div>

            <div>
              <label style={{ fontSize: 10, color: C.t3, display: "block", marginBottom: 5 }}>Cambiar rol</label>
              <select
                value={selected.role}
                onChange={(e) => changeRole(selected, e.target.value)}
                style={{ width: "100%", padding: "8px 10px", fontSize: 12, borderRadius: 6, backgroundColor: C.card, border: "1px solid " + C.border, color: C.t1, outline: "none", fontFamily: FONT }}
              >
                <option value="user">Usuario</option>
                <option value="analyst">Analista</option>
                <option value="operator">Operador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Button
                variant="danger" size="sm" icon={<ShieldOff size={13} />} style={{ flex: 1 }}
                onClick={() => { changeStatus(selected, "blocked"); setSelected(null); }}
                disabled={selected.accountStatus === "blocked"}
              >
                Bloquear cuenta
              </Button>
              <Button
                variant="success" size="sm" icon={<ShieldCheck size={13} />} style={{ flex: 1 }}
                onClick={() => { changeStatus(selected, "active"); setSelected(null); }}
                disabled={selected.accountStatus === "active"}
              >
                Activar cuenta
              </Button>
            </div>

            <div style={{ fontSize: 9, color: C.t3, display: "flex", alignItems: "center", gap: 5 }}>
              <UserCog size={11} /> Las acciones quedan registradas en la auditoría inmutable.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
