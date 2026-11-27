import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuthStore } from "../../store/auth.slice";
import { authApi } from "../../api/auth.api";
import AuthLayout, { authPanelClass } from "../../components/layout/AuthLayout";

export default function ResetPassword() {
  const location = useLocation();
  const [tokenFromUrl] = useState(() => new URLSearchParams(location.hash.slice(1)).get("token"));
  const endLocally = useAuthStore((state) => state.endLocally);
  /* Si el usuario no abrió el enlace del correo, puede escribir el código de 6 dígitos */
  const [code, setCode] = useState("");
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (tokenFromUrl && location.hash) navigate(location.pathname, { replace: true, state: location.state });
  }, [tokenFromUrl, location.hash, location.pathname, location.state, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Las contraseñas no coinciden"); return; }
    const credential = (tokenFromUrl || code).trim();
    if (!credential) { setError("Ingresa el código de 6 dígitos que recibiste por correo"); return; }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
      setError("La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.resetPassword(credential, password, tokenFromUrl ? undefined : email.trim());
      endLocally();
      setPassword(""); setConfirmPassword(""); setCode("");
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al restablecer contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className={authPanelClass}>
        {!success ? (
          <>
            <h2 className="text-2xl font-semibold text-white mb-2">Nueva contraseña</h2>
            <p className="text-gray-400 text-sm mb-6">
              {tokenFromUrl
                ? "Ingresa tu nueva contraseña."
                : "Escribe el código que te enviamos por correo y tu nueva contraseña."}
            </p>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!tokenFromUrl && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                    <input type="email" aria-label="Correo de la cuenta" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                      placeholder="tu@email.com" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Código de 6 dígitos</label>
                    <input type="text" inputMode="numeric" maxLength={6} aria-label="Código de recuperación" value={code}
                      onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setError(""); }}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.5em] placeholder-gray-600 focus:outline-none focus:border-[#00d4aa] transition-colors"
                      placeholder="000000" required />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nueva contraseña</label>
                <input type="password" aria-label="Contraseña nueva" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                  placeholder="Min 8 caracteres, mayúscula y número" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Confirmar contraseña</label>
                <input type="password" aria-label="Confirmar contraseña nueva" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                  placeholder="Repetir contraseña" required />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#00d4aa] hover:bg-[#00b894] disabled:opacity-50 text-black font-semibold py-3 rounded-xl transition-colors">
                {loading ? "Guardando..." : "Cambiar contraseña"}
              </button>
            </form>
            <p className="text-center text-gray-400 mt-4 text-sm">
              <Link to="/forgot-password" className="text-[#00d4aa] hover:underline">¿No recibiste el código? Solicitar otro</Link>
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Contraseña actualizada</h2>
            <p className="text-gray-400 mb-6">Ya puedes iniciar sesión con tu nueva contraseña.</p>
            <button onClick={() => navigate("/login")} className="w-full bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold py-3 rounded-xl transition-colors">Iniciar sesión</button>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
