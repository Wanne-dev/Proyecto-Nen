import { PORTAL_HOME } from "../../constants/navigation";
import { useState } from "react";
import { useAuthStore } from "../../store/auth.slice";
import { useNavigate, useLocation, Link } from "react-router-dom";
import AuthLayout, { authPanelClass } from "../../components/layout/AuthLayout";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code2FA, setCode2FA] = useState("");
  const { login, isLoading, error, pending2FA, clearError, setPending2FA } = useAuthStore();
  const navigate = useNavigate();
  const passwordChanged = !!useLocation().state?.passwordChanged;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      if (useAuthStore.getState().isAuthenticated) {
        navigate(useAuthStore.getState().user?.isVerified ? PORTAL_HOME : "/verify", { replace: true });
      }
    } catch {}
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password, code2FA);
      setPassword("");
      navigate(useAuthStore.getState().user?.isVerified ? PORTAL_HOME : "/verify", { replace: true });
    } catch {}
  };

  return (
    <AuthLayout subtitle="Accede a tu cuenta">
      <div className={authPanelClass}>
        {!pending2FA ? (
          <>
            <h2 className="text-2xl font-semibold text-white mb-6">Iniciar sesión</h2>
            {passwordChanged && <p role="status" className="text-emerald-400 mb-3 text-sm">Contraseña actualizada. Inicia sesión de nuevo.</p>}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input type="email" aria-label="Email" autoComplete="username" value={email} onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                  placeholder="tu@email.com" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
                <input type="password" aria-label="Contraseña" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                  placeholder="Tu contraseña" required />
              </div>
              <button type="submit" disabled={isLoading}
                className="w-full bg-[#00d4aa] hover:bg-[#00b894] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-colors">
                {isLoading ? "Ingresando..." : "Iniciar sesión"}
              </button>
            </form>
            <div className="mt-4 flex items-center justify-between text-sm">
              <Link to="/forgot-password" className="text-[#00d4aa] hover:underline">¿Olvidaste tu contraseña?</Link>
              <Link to="/register" className="text-[#00d4aa] hover:underline">Crear cuenta</Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-semibold text-white mb-2">Verificación 2FA</h2>
            <p className="text-gray-400 text-sm mb-6">Ingresa el código de 6 dígitos de tu app autenticadora.</p>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            <form onSubmit={handle2FA} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Código de 6 dígitos</label>
                <input type="text" aria-label="Código 2FA" inputMode="numeric" autoComplete="one-time-code" value={code2FA} onChange={(e) => { setCode2FA(e.target.value); clearError(); }}
                  maxLength={6} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.5em] placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors font-mono"
                  placeholder="000000" required />
              </div>
              <button type="submit" disabled={isLoading}
                className="w-full bg-[#00d4aa] hover:bg-[#00b894] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-colors">
                {isLoading ? "Verificando..." : "Verificar"}
              </button>
            </form>
            <button type="button" className="mt-4 text-sm text-gray-300 underline" onClick={() => {
              setPending2FA(false);
              setPassword("");
              setCode2FA("");
              clearError();
            }}>Usar otra cuenta</button>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
