import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { PORTAL_HOME } from "../../constants/navigation";
import { useAuthStore } from "../../store/auth.slice";
import Toasts from "../common/Toasts";
import Header from "./Header";
import PortalFrame from "./PortalFrame";

/** El mismo marco para cuentas personales y personal autorizado. */
export default function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // La portada de IA usa el vídeo a pantalla completa: no lleva la franja contextual.
  const assistantPage = pathname.replace(/\/+$/, "").toLowerCase() === PORTAL_HOME;

  return (
    <>
      <PortalFrame user={user} renderHeader={(navigation) => assistantPage ? null : <Header mobileNavigation={navigation} />} onLogout={async () => {
        await logout();
        navigate("/login", { replace: true });
      }}>
        <Outlet />
      </PortalFrame>
      <Toasts />
    </>
  );
}
