/* Cabecera superior — BANCA NEN (API real) */
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, LogOut, UserCircle2, ShieldCheck, ChevronDown, Wifi, WifiOff } from "lucide-react";
import { useAuthStore } from "../../store/auth.slice";
import { useWalletStore } from "../../store/wallet.slice";
import NotificationBell from "../common/NotificationBell";
import { C, FONT, fmt } from "../../theme";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/wallet": "Mi Billetera",
  "/wallet/deposit": "Depositar Fondos",
  "/wallet/withdraw": "Retirar Fondos",
  "/trading": "Trading",
  "/trading/prediction": "Predicción IA",
  "/trading/history": "Historial de Órdenes",
  "/reports": "Reportes",
  "/settings": "Ajustes",
  "/settings/security": "Seguridad",
  "/admin": "Panel de Control",
  "/admin/users": "Gestión de Usuarios",
  "/admin/audit": "Auditoría Inmutable",
  "/admin/reports": "Reportes Administrativos",
  "/admin/settings": "Configuración del Sistema",
};

interface Props {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: Props) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [menuOpen, setMenuOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const nav = useNavigate();
  const loc = useLocation();
  const totalUsd = useWalletStore((s) => Number(s.wallet?.totalBalanceUsd || 0));

  /* Verificar conectividad con el backend real */
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch("/api/v1/health", { signal: ctrl.signal });
        clearTimeout(t);
        if (active) setApiOnline(res.ok);
      } catch {
        if (active) setApiOnline(false);
      }
    };
    check();
    const iv = setInterval(check, 20000);
    return () => { active = false; clearInterval(iv); };
  }, []);

  const handleLogout = () => {
    logout();
    nav("/login");
  };

  const title = TITLES[loc.pathname] || "BANCA NEN";

  return (
    <header
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        padding: "0 18px", height: 54, backgroundColor: C.bg2,
        borderBottom: "1px solid " + C.border, fontFamily: FONT, flexShrink: 0,
        position: "relative", zIndex: 50,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <button onClick={onToggleSidebar} style={{ background: "none", border: "none", cursor: "pointer", color: C.t2, display: "flex", padding: 4 }} aria-label="Menú">
          <Menu size={18} />
        </button>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: C.t1, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h2>
        {/* Estado de conexión real */}
        {apiOnline !== null && (
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 5, fontSize: 9, fontWeight: 700,
              padding: "2px 9px", borderRadius: 999, whiteSpace: "nowrap",
              backgroundColor: apiOnline ? C.green + "14" : C.red + "14",
              color: apiOnline ? C.green : C.red,
              border: "1px solid " + (apiOnline ? C.green + "44" : C.red + "44"),
            }}
          >
            {apiOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
            {apiOnline ? "API conectada" : "Sin conexión API"}
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Balance real */}
        <div style={{ display: "none", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 7, backgroundColor: C.card, border: "1px solid " + C.border, fontSize: 11, "@media (min-width: 900px)": { display: "flex" } } as any}>
          <span style={{ color: C.t3 }}>Portafolio</span>
          <span style={{ fontWeight: 700, color: C.t1 }}>{fmt(totalUsd)}</span>
        </div>

        <NotificationBell />

        {/* Menú usuario */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "4px 8px", borderRadius: 7,
              backgroundColor: menuOpen ? C.card : "transparent", border: "1px solid transparent",
              cursor: "pointer", fontFamily: FONT,
            }}
          >
            <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: user?.role === "admin" ? C.gold : C.green, color: "#0A0A0F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>
              {((user?.firstName?.[0] || "") + (user?.lastName?.[0] || "")).toUpperCase()}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.t1, display: "none" }}>{user?.firstName}</span>
            <ChevronDown size={12} color={C.t3} />
          </button>

          {menuOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 997 }} onClick={() => setMenuOpen(false)} />
              <div
                style={{
                  position: "absolute", right: 0, top: 40, width: 230, backgroundColor: C.bg2,
                  border: "1px solid " + C.border, borderRadius: 10, zIndex: 998,
                  boxShadow: "0 14px 40px rgba(0,0,0,.5)", padding: 6, fontFamily: FONT,
                }}
              >
                <div style={{ padding: "8px 10px", borderBottom: "1px solid " + C.border, marginBottom: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{user?.firstName} {user?.lastName}</div>
                  <div style={{ fontSize: 9, color: C.t3 }}>{user?.email}</div>
                  <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: C.green, backgroundColor: C.green + "14", padding: "2px 7px", borderRadius: 999, textTransform: "uppercase" }}>
                      {user?.role}
                    </span>
                    <span style={{ fontSize: 8, fontWeight: 700, color: C.blue, backgroundColor: C.blue + "14", padding: "2px 7px", borderRadius: 999 }}>
                      KYC {user?.kycStatus}
                    </span>
                  </div>
                </div>
                <button onClick={() => { setMenuOpen(false); nav("/settings"); }} style={{ ...menuItem }}>
                  <UserCircle2 size={14} /> Mi perfil
                </button>
                <button onClick={() => { setMenuOpen(false); nav("/settings/security"); }} style={{ ...menuItem }}>
                  <ShieldCheck size={14} /> Seguridad
                </button>
                <button onClick={handleLogout} style={{ ...menuItem, color: C.red }}>
                  <LogOut size={14} /> Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

const menuItem: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 10px",
  background: "none", border: "none", cursor: "pointer", color: C.t1, fontSize: 12,
  borderRadius: 6, textAlign: "left", fontFamily: FONT,
};
