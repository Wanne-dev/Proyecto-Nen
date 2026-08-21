import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { useAuthStore } from "./store/auth.slice";

/* Auth */
import Landing from "./pages/landing/Landing";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Verify from "./pages/auth/Verify";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import TwoFactorSetup from "./pages/auth/TwoFactorSetup";

/* Portal (usuario + admin) */
import Dashboard from "./pages/dashboard/Dashboard";
import WalletPage from "./pages/wallet/Wallet";
import Deposit from "./pages/wallet/Deposit";
import Withdraw from "./pages/wallet/Withdraw";
import Trading from "./pages/trading/Trading";
import Prediction from "./pages/trading/Prediction";
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
  if (isAuthenticated && user?.isVerified) return <Navigate to="/dashboard" />;
  if (isAuthenticated) return <Navigate to="/verify" />;
  return <>{children}</>;
}

function VerificationRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.isVerified) return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

function VerifiedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!user?.isVerified) return <Navigate to="/verify" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Público */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/verify" element={<VerificationRoute><Verify /></VerificationRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/2fa-setup" element={<VerifiedRoute><TwoFactorSetup /></VerifiedRoute>} />

        {/* Un solo layout para todos los portales (el sidebar se adapta al rol) */}
        <Route element={<VerifiedRoute><AppLayout /></VerifiedRoute>}>
          {/* Portal usuario */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/wallet/deposit" element={<Deposit />} />
          <Route path="/wallet/withdraw" element={<Withdraw />} />
          <Route path="/trading" element={<Trading />} />
          <Route path="/trading/prediction" element={<Prediction />} />
          <Route path="/trading/history" element={<OrderHistory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/security" element={<Security />} />

          {/* Portal admin (AppLayout valida el rol) */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/audit" element={<Audit />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
