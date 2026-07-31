import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authApi } from "../../api/auth.api";

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Las contrasenas no coinciden"); return; }
    setLoading(true);
    setError("");
    try {
      await authApi.resetPassword(token || "", password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Error al restablecer contrasena");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">BANCA NEN</h1>
        </div>
        <div className="bg-[#1a1a1a] rounded-2xl p-8 shadow-2xl border border-white/5">
          {!success ? (
            <>
              <h2 className="text-2xl font-semibold text-white mb-2">Nueva contrasena</h2>
              <p className="text-gray-400 text-sm mb-6">Ingresa tu nueva contrasena.</p>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nueva contrasena</label>
                  <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                    placeholder="Min 8 caracteres, mayuscula y numero" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Confirmar contrasena</label>
                  <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                    placeholder="Repetir contrasena" required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#00d4aa] hover:bg-[#00b894] disabled:opacity-50 text-black font-semibold py-3 rounded-xl transition-colors">
                  {loading ? "Guardando..." : "Cambiar contrasena"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Contrasena actualizada</h2>
              <p className="text-gray-400 mb-6">Ya puedes iniciar sesion con tu nueva contrasena.</p>
              <button onClick={() => navigate("/login")} className="w-full bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold py-3 rounded-xl transition-colors">Iniciar sesion</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
