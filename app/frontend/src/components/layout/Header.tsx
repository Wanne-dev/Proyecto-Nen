/* Cabecera del portal: contexto de la página y estado de API. */
import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Wifi, WifiOff } from "lucide-react";
import NotificationBell from "../common/NotificationBell";
import { PORTAL_HOME, PORTAL_TITLE } from "../../constants/navigation";

const TITLES: Record<string, string> = {
  [PORTAL_HOME]: PORTAL_TITLE,
  "/wallet": "Mi billetera",
  "/wallet/deposit": "Depósito",
  "/wallet/withdraw": "Retiro",
  "/trading": "Trading",
  "/trading/prediction": "Noticias",
  "/trading/history": "Historial de órdenes",
  "/reports": "Mis reportes",
  "/settings": "Ajustes",
  "/settings/security": "Seguridad",
  "/2fa-setup": "Configurar 2FA",
  "/admin": "Panel de control",
  "/admin/users": "Gestión de usuarios",
  "/admin/audit": "Auditoría",
  "/admin/reports": "Reportes administrativos",
  "/admin/settings": "Configuración del sistema",
};

export default function Header({ mobileNavigation }: { mobileNavigation: ReactNode }) {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    let active = true;
    let controller: AbortController | undefined;
    const check = async () => {
      const request = new AbortController();
      controller = request;
      const timeout = window.setTimeout(() => request.abort(), 3000);
      try {
        const res = await fetch("/api/v1/health", { signal: request.signal });
        if (active) setApiOnline(res.ok);
      } catch {
        if (active) setApiOnline(false);
      } finally {
        window.clearTimeout(timeout);
      }
    };
    void check();
    const interval = window.setInterval(check, 20000);
    return () => { active = false; controller?.abort(); window.clearInterval(interval); };
  }, []);

  const path = pathname.replace(/\/$/, "").toLowerCase();
  const staff = path === "/admin" || path.startsWith("/admin/");
  return (
    <header className="nen-portal__header">
      <div className="nen-portal__context">
        {mobileNavigation}
        <div className="nen-portal__breadcrumbs">
          <span className="nen-portal__area">{staff ? "Administración" : "Espacio personal"}</span>
          <span className="nen-portal__separator" aria-hidden="true">/</span>
          <p className="nen-portal__title">{TITLES[path] ?? "BANCA NEN"}</p>
        </div>
      </div>
      <div className="nen-portal__status">
        {apiOnline !== null && <span className="nen-portal__api" data-online={apiOnline}>
          {apiOnline ? <Wifi size={12} aria-hidden="true" /> : <WifiOff size={12} aria-hidden="true" />}
          {apiOnline ? "API conectada" : "Sin conexión API"}
        </span>}
        <NotificationBell />
      </div>
    </header>
  );
}
