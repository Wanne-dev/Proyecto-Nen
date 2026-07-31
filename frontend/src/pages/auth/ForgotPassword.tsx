import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../../api/auth.api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Error al enviar el email");
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
          {!sent ? (
            <>
              <h2 className="text-2xl font-semibold text-white mb-2">Recuperar contrasena</h2>
              <p className="text-gray-400 text-sm mb-6">Ingresa tu email y te enviaremos un enlace para restablecer tu contrasena.</p>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                    placeholder="tu@email.com" required />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#00d4aa] hover:bg-[#00b894] disabled:opacity-50 text-black font-semibold py-3 rounded-xl transition-colors">
                  {loading ? "Enviando..." : "Enviar enlace de recuperacion"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-[#00d4aa]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-[#00d4aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Email enviado</h2>
              <p className="text-gray-400 mb-6">Revisa tu bandeja en <span className="text-white">{email}</span>. Si tienes telefono registrado, tambien recibiras un SMS.</p>
              <button onClick={() => navigate("/login")} className="w-full bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold py-3 rounded-xl transition-colors">Volver a iniciar sesion</button>
            </>
          )}
          <p className="text-center text-gray-400 mt-4 text-sm">
            <Link to="/login" className="text-[#00d4aa] hover:underline">Volver al login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
