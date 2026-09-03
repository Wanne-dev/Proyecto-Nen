import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { authApi } from "../../api/auth.api";

/* Línea de valores de la bolsa (igual que login y landing) */
const TICKER_ITEMS = [
  { symbol: "BTC/USD", price: "67,432", change: "+2.34%", up: true },
  { symbol: "ETH/USD", price: "3,521", change: "+1.12%", up: true },
  { symbol: "EUR/USD", price: "1.0845", change: "-0.12%", up: false },
  { symbol: "AAPL", price: "198.45", change: "+0.67%", up: true },
  { symbol: "SPX", price: "5,432", change: "+0.89%", up: true },
  { symbol: "GOLD", price: "2,412", change: "+0.45%", up: true },
  { symbol: "NVDA", price: "892", change: "+5.21%", up: true },
  { symbol: "TSLA", price: "248", change: "+3.67%", up: true },
];

function TickerBar() {
  return (
    <div className="w-full overflow-hidden bg-black/40 backdrop-blur-sm border-b border-white/10 py-2">
      <motion.div
        className="flex gap-10 whitespace-nowrap"
        animate={{ x: [0, -1600] }}
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
      >
        {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span key={i} className="flex items-center gap-2 text-xs font-mono">
            <span className="text-gray-400">{item.symbol}</span>
            <span className="text-gray-200">${item.price}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[12px] font-medium ${
                item.up ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"
              }`}
            >
              {item.change}
            </span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

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
      await authApi.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Error al enviar el email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] overflow-hidden text-white">
      {/* ===== Video de fondo ===== */}
      <div className="absolute inset-0 z-0">
        <video
          className="w-full h-full object-cover"
          src="/assets/videos/login-bg.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/40 via-transparent to-[#0a0a0f]/80" />
      </div>

      {/* ===== Línea de valores de la bolsa ===== */}
      <div className="relative z-20">
        <TickerBar />
      </div>

      {/* ===== Botón volver al inicio ===== */}
      <Link
        to="/"
        className="absolute top-16 left-4 z-20 inline-flex items-center gap-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md px-4 py-2 text-[15px] text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al inicio
      </Link>

      {/* ===== Tarjeta centrada ===== */}
      <div className="relative z-10 flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Marca */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00d4aa] to-[#0a84ff] flex items-center justify-center shadow-lg shadow-[#00d4aa]/20 mb-4">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              BANCA <span className="text-[#00d4aa]">NEN</span>
            </h1>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
            {!sent ? (
              <>
                <h2 className="text-2xl font-semibold text-white mb-2">Recuperar contrasena</h2>
                <p className="text-gray-400 text-sm mb-6">Ingresa tu email y te enviaremos un codigo de 6 digitos para restablecer tu contrasena.</p>
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
                <h2 className="text-2xl font-semibold text-white mb-2">Revisa tu correo</h2>
                <p className="text-gray-400 mb-6">
                  Si existe una cuenta con <span className="text-white">{email}</span>, te enviamos un codigo de 6 digitos y un enlace.
                  Revisa tambien la carpeta de spam. El codigo expira en 10 minutos.
                </p>
                <button onClick={() => navigate("/reset-password", { state: { email } })} className="w-full bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold py-3 rounded-xl transition-colors">Ya tengo el codigo</button>
                <button onClick={() => navigate("/login")} className="w-full mt-3 border border-white/10 text-gray-300 hover:text-white font-medium py-3 rounded-xl transition-colors">Volver a iniciar sesion</button>
              </>
            )}
            <p className="text-center text-gray-400 mt-4 text-sm">
              <Link to="/login" className="text-[#00d4aa] hover:underline">Volver al login</Link>
            </p>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">
            © {new Date().getFullYear()} BANCA NEN · Seguridad de nivel bancario
          </p>
        </motion.div>
      </div>
    </div>
  );
}
