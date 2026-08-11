import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { useAuthStore } from "./store/auth.slice";

import Landing from "./pages/landing/Landing";

import Login from "./pages/auth/Login";

import Register from "./pages/auth/Register";

import Verify from "./pages/auth/Verify";

import ForgotPassword from "./pages/auth/ForgotPassword";

import ResetPassword from "./pages/auth/ResetPassword";

import Dashboard from "./pages/dashboard/Dashboard";

import WalletPage from "./pages/wallet/Wallet.tsx";




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

        <Route path="/" element={<Landing />} />

        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        <Route path="/verify" element={<VerificationRoute><Verify /></VerificationRoute>} />

        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

        <Route path="/reset-password/:token" element={<ResetPassword />} />

        <Route path="/dashboard" element={<VerifiedRoute><Dashboard /></VerifiedRoute>} />

        <Route path="/wallet" element={<VerifiedRoute><WalletPage /></VerifiedRoute>} />

      </Routes>

    </BrowserRouter>

  );

}