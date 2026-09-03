import { useState } from "react";
import { motion } from "framer-motion";
import { useAuthStore } from "../../store/auth.slice";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, TrendingUp } from "lucide-react";

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

export default function Register() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentType, setDocumentType] = useState("cc");
  const [documentNumber, setDocumentNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      clearError();
      return;
    }
    try {
      await register({ email, firstName, lastName, documentType, documentNumber, dateOfBirth, phone, password });
      navigate("/verify");
    } catch {}
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

      {/* ===== Tarjeta de registro centrada ===== */}
      <div className="relative z-10 flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          {/* Marca */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00d4aa] to-[#0a84ff] flex items-center justify-center shadow-lg shadow-[#00d4aa]/20 mb-4">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              BANCA <span className="text-[#00d4aa]">NEN</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">Crea tu cuenta de inversion</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-6">Registro</h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                  placeholder="tu@email.com" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
                  <input type="text" value={firstName} onChange={(e) => { setFirstName(e.target.value); clearError(); }}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                    placeholder="Juan" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Apellido</label>
                  <input type="text" value={lastName} onChange={(e) => { setLastName(e.target.value); clearError(); }}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                    placeholder="Perez" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de documento</label>
                  <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00d4aa] transition-colors">
                    <option value="cc">Cedula de ciudadania</option>
                    <option value="ce">Cedula de extranjeria</option>
                    <option value="pasaporte">Pasaporte</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Numero de documento</label>
                  <input type="text" value={documentNumber} onChange={(e) => { setDocumentNumber(e.target.value); clearError(); }}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                    placeholder="1234567890" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Fecha de nacimiento</label>
                  <input type="date" value={dateOfBirth} onChange={(e) => { setDateOfBirth(e.target.value); clearError(); }}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00d4aa] transition-colors"
                    required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Telefono</label>
                  <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); clearError(); }}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                    placeholder="+573001234567" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Contrasena</label>
                <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                  placeholder="Min 8 caracteres, mayuscula y numero" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Confirmar contrasena</label>
                <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                  placeholder="Repetir contrasena" required />
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full mt-6 bg-[#00d4aa] hover:bg-[#00b894] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-colors">
              {isLoading ? "Registrando..." : "Crear cuenta"}
            </button>

            <p className="text-center text-gray-400 mt-4 text-sm">
              Ya tienes cuenta? <Link to="/login" className="text-[#00d4aa] hover:underline">Inicia sesion</Link>
            </p>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            © {new Date().getFullYear()} BANCA NEN · Seguridad de nivel bancario
          </p>
        </motion.div>
      </div>
    </div>
  );
}
