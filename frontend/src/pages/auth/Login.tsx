import { useState } from "react";
import { useAuthStore } from "../../store/auth.slice";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code2FA, setCode2FA] = useState("");
  const { login, verify2FA, isLoading, error, pending2FA, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      if (useAuthStore.getState().isAuthenticated) {
        navigate("/dashboard");
      }
    } catch {}
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verify2FA(email, password, code2FA);
      navigate("/dashboard");
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">BANCA NEN</h1>
          <p className="text-gray-400 mt-2">Plataforma de Inversion Inteligente</p>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-8 shadow-2xl border border-white/5">
          {!pending2FA ? (
            <>
              <h2 className="text-2xl font-semibold text-white mb-6">Iniciar sesion</h2>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                    placeholder="tu@email.com" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Contrasena</label>
                  <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                    placeholder="Tu contrasena" required />
                </div>
                <button type="submit" disabled={isLoading}
                  className="w-full bg-[#00d4aa] hover:bg-[#00b894] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-colors">
                  {isLoading ? "Ingresando..." : "Iniciar sesion"}
                </button>
              </form>
              <div className="mt-4 flex items-center justify-between text-sm">
                <Link to="/forgot-password" className="text-[#00d4aa] hover:underline">Olvidaste tu contrasena?</Link>
                <Link to="/register" className="text-[#00d4aa] hover:underline">Crear cuenta</Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-white mb-2">Verificacion 2FA</h2>
              <p className="text-gray-400 text-sm mb-6">Ingresa el codigo de 6 digitos de tu app autenticadora.</p>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              <form onSubmit={handle2FA} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Codigo de 6 digitos</label>
                  <input type="text" value={code2FA} onChange={(e) => { setCode2FA(e.target.value); clearError(); }}
                    maxLength={6} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.5em] placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors font-mono"
                    placeholder="000000" required />
                </div>
                <button type="submit" disabled={isLoading}
                  className="w-full bg-[#00d4aa] hover:bg-[#00b894] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-colors">
                  {isLoading ? "Verificando..." : "Verificar"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
