/* ============================================================
   SIDEBAR ÚNICO — BANCA NEN
   Un solo menú lateral para todos los usuarios (portal usuario
   y portal admin), con iconos, colapsable (rail de iconos) y
   grupos desplegables. Las secciones se muestran según el rol.
   ============================================================ */
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Wallet, PlusCircle, MinusCircle, CandlestickChart,
  BrainCircuit, History, FileBarChart, Settings, Shield, ShieldCheck,
  Users, ScrollText, ServerCog, LogOut, ChevronLeft, ChevronRight,
  ChevronDown, PanelLeftClose, ArrowLeft, ShieldAlert,
} from "lucide-react";
import { useAuthStore } from "../../store/auth.slice";
import { useUIStore } from "../../store/ui.slice";
import { isStaffRole } from "../../types/User.types";
import { C, FONT } from "../../theme";

export interface NavItem {
  to: string;
  label: string;
  Icon: any;
  end?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

const BASE_NAV: NavGroup[] = [
  { title: "Principal", items: [{ to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, end: true }] },
  {
    title: "Billetera",
    items: [
      { to: "/wallet", label: "Mi billetera", Icon: Wallet, end: true },
      { to: "/wallet/deposit", label: "Depositar", Icon: PlusCircle },
      { to: "/wallet/withdraw", label: "Retirar", Icon: MinusCircle },
    ],
  },
  {
    title: "Trading",
    items: [
      { to: "/trading", label: "Trading", Icon: CandlestickChart, end: true },
      { to: "/trading/prediction", label: "Predicción IA", Icon: BrainCircuit },
      { to: "/trading/history", label: "Historial de órdenes", Icon: History },
    ],
  },
  {
    title: "Análisis",
    items: [{ to: "/reports", label: "Reportes", Icon: FileBarChart }],
  },
  {
    title: "Configuración",
    items: [
      { to: "/settings", label: "Ajustes", Icon: Settings },
      { to: "/settings/security", label: "Seguridad", Icon: Shield },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    title: "Administración",
    items: [
      { to: "/admin", label: "Panel de control", Icon: LayoutDashboard, end: true },
      { to: "/admin/users", label: "Usuarios", Icon: Users },
      { to: "/admin/audit", label: "Auditoría", Icon: ScrollText },
      { to: "/admin/reports", label: "Reportes", Icon: FileBarChart },
      { to: "/admin/settings", label: "Configuración", Icon: ServerCog },
    ],
  },
];

function buildNav(role?: string): NavGroup[] {
  const nav: NavGroup[] = [];
  for (const group of BASE_NAV) nav.push({ title: group.title, items: [...group.items] });
  if (isStaffRole(role)) {
    for (const group of ADMIN_NAV) nav.push({ title: group.title, items: [...group.items] });
  }
  return nav;
}

export default function Sidebar() {
  const loc = useLocation();
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("nen-sidebar-collapsed") === "1"; } catch { return false; }
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const groups = buildNav(user?.role);
  const staff = isStaffRole(user?.role);
  const isAdminPage = loc.pathname.startsWith("/admin");

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("nen-sidebar-collapsed", next ? "1" : "0"); } catch { /* ignore */ }
  };

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (item: NavItem) =>
    item.end ? loc.pathname === item.to : loc.pathname.startsWith(item.to);

  const initials = ((user?.firstName?.[0] || "") + (user?.lastName?.[0] || "")).toUpperCase();
  const roleLabel = user?.role === "admin" ? "Administrador"
    : user?.role === "operator" ? "Operador"
    : user?.role === "analyst" ? "Analista" : "Inversor";

  const handleLogout = () => {
    logout();
    nav("/login");
  };

  const w = collapsed ? 68 : 236;

  return (
    <aside
      style={{
        width: w, flexShrink: 0, backgroundColor: C.bg2, borderRight: "1px solid " + C.border,
        display: "flex", flexDirection: "column", fontFamily: FONT, overflowY: "auto",
        transition: "width .18s ease", overflowX: "hidden",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "14px 10px" : "14px 16px", borderBottom: "1px solid " + C.border, minHeight: 60 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: C.gold + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Shield size={18} color={C.gold} />
        </div>
        {!collapsed && (
          <div style={{ lineHeight: 1.1, whiteSpace: "nowrap" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.t1, letterSpacing: 0.3 }}>
              BANCA <span style={{ color: C.gold }}>NEN</span>
            </div>
            <div style={{ fontSize: 9, color: C.t3 }}>Inversión inteligente</div>
          </div>
        )}
      </div>

      {/* Navegación */}
      <div style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
        {groups.map((group) => {
          const open = collapsed ? true : openGroups[group.title] !== false;
          const activeInGroup = group.items.some(isActive);
          return (
            <div key={group.title} style={{ marginBottom: 2 }}>
              {/* Título de grupo */}
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.title)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                    padding: "8px 10px 4px", background: "none", border: "none", cursor: "pointer",
                    fontFamily: FONT, color: activeInGroup ? C.gold : C.t3,
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 }}>
                    {group.title}
                  </span>
                  <ChevronDown size={11} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                </button>
              ) : (
                <div style={{ height: 6 }} />
              )}

              {open &&
                group.items.map((item) => {
                  const active = isActive(item);
                  const itemStyle: React.CSSProperties = {
                    display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "9px 0" : "7px 10px",
                    marginBottom: 2, borderRadius: 8, textDecoration: "none", fontSize: 12,
                    backgroundColor: active ? C.gold + "16" : "transparent",
                    color: active ? C.t1 : C.t2, fontWeight: active ? 600 : 400,
                    borderLeft: "3px solid " + (active ? C.gold : "transparent"),
                    justifyContent: collapsed ? "center" : "flex-start",
                    position: "relative",
                  };
                  return (
                    <Link key={item.to} to={item.to} style={itemStyle} title={collapsed ? item.label : undefined}>
                      <item.Icon size={16} color={active ? C.gold : C.t3} style={{ flexShrink: 0 }} />
                      {!collapsed && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
                    </Link>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* Panel admin shortcut + collapse */}
      <div style={{ borderTop: "1px solid " + C.border, padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
        {staff && (
          <>
            {!collapsed && (
              <Link
                to={isAdminPage ? "/dashboard" : "/admin"}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8,
                  textDecoration: "none", backgroundColor: isAdminPage ? C.blue + "1F" : "transparent",
                  color: C.t1, fontSize: 12, fontWeight: 600,
                }}
              >
                {isAdminPage ? <ArrowLeft size={15} color={C.blue} /> : <ShieldCheck size={15} color={C.gold} />}
                <span>{isAdminPage ? "Volver al portal" : "Portal admin"}</span>
              </Link>
            )}
            {collapsed && (
              <Link to={isAdminPage ? "/dashboard" : "/admin"} title={isAdminPage ? "Volver al portal" : "Portal admin"} style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
                {isAdminPage ? <ArrowLeft size={17} color={C.blue} /> : <ShieldCheck size={17} color={C.gold} />}
              </Link>
            )}
          </>
        )}

        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "none",
            border: "none", cursor: "pointer", color: C.t3, fontFamily: FONT, fontSize: 11,
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <><PanelLeftClose size={15} /> Colapsar menú</>}
        </button>
      </div>

      {/* Usuario */}
      <div style={{ borderTop: "1px solid " + C.border, padding: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "4px 4px" }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", backgroundColor: user?.role === "admin" ? C.gold : C.green, color: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
            {initials || "U"}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.firstName} {user?.lastName}
              </div>
              <div style={{ fontSize: 9, color: C.t3 }}>{roleLabel}</div>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} title="Cerrar sesión" style={{ background: "none", border: "none", cursor: "pointer", color: C.t3, display: "flex", padding: 4 }}>
              <LogOut size={14} />
            </button>
          )}
          {collapsed && (
            <button onClick={handleLogout} title="Cerrar sesión" style={{ position: "absolute", ...collapseLogoutStyle }}>
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

const collapseLogoutStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer", color: C.t3, padding: 4,
  right: 8, marginLeft: 8,
};
