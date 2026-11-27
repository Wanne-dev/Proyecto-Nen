import { useState } from "react";
import { useAuthStore } from "../../store/auth.slice";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout, { authPanelClass } from "../../components/layout/AuthLayout";

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
  const [confirmError, setConfirmError] = useState("");
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmError("");
    if (password !== confirmPassword) {
      setConfirmError("Las contraseñas no coinciden");
      clearError();
      return;
    }
    try {
      await register({ email, firstName, lastName, documentType, documentNumber, dateOfBirth, phone, password });
      navigate("/verify");
    } catch {}
  };

  return (
    <AuthLayout subtitle="Crea una cuenta para operar con saldo virtual. Usa datos ficticios.">
      <form onSubmit={handleSubmit} className={authPanelClass}>
        <h2 className="text-xl font-semibold text-white mb-6">Registro</h2>

        {(confirmError || error) && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm">{confirmError || error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input type="email" aria-label="Email" value={email} onChange={(e) => { setEmail(e.target.value); clearError(); }}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
              placeholder="tu@email.com" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
              <input type="text" aria-label="Nombre" value={firstName} onChange={(e) => { setFirstName(e.target.value); clearError(); }}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                placeholder="Juan" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Apellido</label>
              <input type="text" aria-label="Apellido" value={lastName} onChange={(e) => { setLastName(e.target.value); clearError(); }}
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
              <input type="text" aria-label="Número de documento" value={documentNumber} onChange={(e) => { setDocumentNumber(e.target.value); clearError(); }}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                placeholder="1234567890" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Fecha de nacimiento</label>
              <input type="date" aria-label="Fecha de nacimiento" value={dateOfBirth} onChange={(e) => { setDateOfBirth(e.target.value); clearError(); }}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00d4aa] transition-colors"
                required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Telefono</label>
              <input type="tel" aria-label="Teléfono" value={phone} onChange={(e) => { setPhone(e.target.value); clearError(); }}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
                placeholder="+573001234567" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
            <input type="password" aria-label="Contraseña" value={password} onChange={(e) => { setPassword(e.target.value); clearError(); }}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
              placeholder="Min 8 caracteres, mayúscula y número" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Confirmar contraseña</label>
            <input type="password" aria-label="Confirmar contraseña" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); clearError(); setConfirmError(""); }}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors"
              placeholder="Repetir contraseña" required />
          </div>
        </div>

        <button type="submit" disabled={isLoading}
          className="w-full mt-6 bg-[#00d4aa] hover:bg-[#00b894] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-xl transition-colors">
          {isLoading ? "Registrando..." : "Crear cuenta"}
        </button>

        <p className="text-center text-gray-400 mt-4 text-sm">
          Ya tienes cuenta? <Link to="/login" className="text-[#00d4aa] hover:underline">Inicia sesión</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
