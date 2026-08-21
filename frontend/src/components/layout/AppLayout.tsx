/* ============================================================
   LAYOUT ÚNICO — BANCA NEN
   Un solo layout para TODOS los usuarios autenticados (portal
   usuario y portal admin) con el sidebar único colapsable.
   Protege las rutas /admin según el rol.
   ============================================================ */
import { useState, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Toasts from "../common/Toasts";
import { useAuthStore } from "../../store/auth.slice";
import { isStaffRole } from "../../types/User.types";
import { authService } from "../../services/auth";
import { C, FONT } from "../../theme";

export default function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();

  /* Validar la sesión real al entrar: si el token es viejo/inválido
     (p. ej. de la versión demo anterior), se limpia y se redirige a /login.
     Si es válido, refresca el perfil desde la BD (rol, KYC, etc.). */
  useEffect(() => {
    if (!token) return;
    let active = true;
    authService
      .getProfile()
      .then((profile) => {
        if (active) setUser(profile);
      })
      .catch(() => {
        /* el interceptor 401 ya limpió el storage y redirige a /login */
        if (active) logout();
      });
    return () => { active = false; };
  }, [token, setUser, logout]);

  const isAdminPage = loc.pathname.startsWith("/admin");
  const staff = isStaffRole(user?.role);

  /* Guardia de rol: /admin solo para staff */
  if (isAdminPage && !staff) return <Navigate to="/dashboard" replace />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: C.bg, color: C.t1, fontFamily: FONT }}>
      <div style={{ display: "flex" }}>
        <Sidebar />
      </div>

      {/* Sidebar mobile overlay */}
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 900, display: "flex" }}>
          <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,.6)" }} onClick={() => setMobileOpen(false)} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <Sidebar />
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Header onToggleSidebar={() => setMobileOpen(true)} />
        <main style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <Outlet />
        </main>
      </div>
      <Toasts />
    </div>
  );
}
