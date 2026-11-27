import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { canAccessStaffSection, type StaffSection } from "./types/User.types";
import { useAuthStore } from "./store/auth.slice";
import { PORTAL_HOME } from "./constants/navigation";

/* Auth */
import Landing from "./pages/landing/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Verify from "./pages/auth/Verify";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import TwoFactorSetup from "./pages/auth/TwoFactorSetup";

/* Portal (usuario + admin) */
import Assistant from "./pages/assistant/Assistant";
import WalletPage from "./pages/wallet/Wallet";
import Deposit from "./pages/wallet/Deposit";
import Withdraw from "./pages/wallet/Withdraw";
import Trading from "./pages/trading/Trading";
import Prediction from "./pages/trading/Prediction";
import NewsPortal from "./pages/news/NewsPortal";
import OrderHistory from "./pages/trading/OrderHistory";
import Reports from "./pages/reports/Reports";
import Settings from "./pages/settings/Settings";
import Security from "./pages/settings/Security";
import Admin from "./pages/admin/Admin";
import Users from "./pages/admin/Users";
import Audit from "./pages/admin/Audit";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";

/* Layout único */
import AppLayout from "./components/layout/AppLayout";

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user?.isVerified) return <Navigate to={PORTAL_HOME} />;
  if (isAuthenticated) return <Navigate to="/verify" />;
  return <>{children}</>;
}

function VerificationRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.isVerified) return <Navigate to={PORTAL_HOME} />;
  return <>{children}</>;
}

function VerifiedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!user?.isVerified) return <Navigate to="/verify" />;
  return <>{children}</>;
}

function StaffRoute({ children, section }: { children: React.ReactNode; section: StaffSection }) {
  const user = useAuthStore((s) => s.user);
  if (!canAccessStaffSection(user?.role, section)) return <Navigate to={PORTAL_HOME} replace />;
  if (!user?.twoFactorEnabled) return <Navigate to="/settings/security?staff=2fa" replace />;
  return <>{children}</>;
}

export default function App() {
  const { ready, unavailable, restore } = useAuthStore();
  useEffect(() => {
    const sync = () => { void restore(); };
    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, [restore]);
  if (!ready || unavailable) return (
    <main className="min-h-screen grid place-content-center gap-4 p-6 bg-[#0a0a0f] text-white text-center">
      <p role={unavailable ? "alert" : "status"}>{unavailable || "Comprobando la sesión…"}</p>
      {unavailable && <button className="rounded-lg bg-emerald-500 p-3 text-black" onClick={() => void restore()}>Reintentar</button>}
    </main>
  );
  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/verify" element={<VerificationRoute><Verify /></VerificationRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Un solo layout para todos los portales (el menú superior se adapta al rol) */}
        <Route element={<VerifiedRoute><AppLayout /></VerifiedRoute>}>
          {/* Portal usuario */}
          <Route path={PORTAL_HOME} element={<Assistant />} />
          {/* Compatibilidad con enlaces y marcadores anteriores, sin montar el inicio viejo. */}
          <Route path="/dashboard" element={<Navigate to={PORTAL_HOME} replace />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/wallet/deposit" element={<Deposit />} />
          <Route path="/wallet/withdraw" element={<Withdraw />} />
          <Route path="/trading" element={<Trading />} />
          <Route path="/trading/prediction" element={<NewsPortal />} />
          <Route path="/trading/history" element={<OrderHistory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/security" element={<Security />} />
          <Route path="/2fa-setup" element={<TwoFactorSetup />} />

          {/* Portal admin (AppLayout valida el rol) */}
          <Route path="/admin" element={<StaffRoute section="overview"><Admin /></StaffRoute>} />
          <Route path="/admin/users" element={<StaffRoute section="users"><Users /></StaffRoute>} />
          <Route path="/admin/audit" element={<StaffRoute section="audit"><Audit /></StaffRoute>} />
          <Route path="/admin/reports" element={<StaffRoute section="overview"><AdminReports /></StaffRoute>} />
          <Route path="/admin/settings" element={<StaffRoute section="settings"><AdminSettings /></StaffRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
