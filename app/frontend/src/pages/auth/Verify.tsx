import { PORTAL_HOME } from "../../constants/navigation";
import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/auth.slice";
import { useNavigate } from "react-router-dom";
import AuthLayout, { authPanelClass } from "../../components/layout/AuthLayout";

export default function Verify() {
  const { user, verifyEmailCode, verifyPhoneCode, resendVerification, verificationMessage, logout, isLoading, error, clearError } = useAuthStore();
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState(verificationMessage);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();
  const phoneStep = !!user?.emailVerified && !!user.phoneVerificationRequired;

  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((remaining) => remaining - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      const result = await (phoneStep ? verifyPhoneCode(code) : verifyEmailCode(code));
      if (result.fullyVerified) navigate(PORTAL_HOME, { replace: true });
      else { setCode(""); setNotice("Correo verificado. Sigue con el código enviado al teléfono."); setCooldown(0); }
    } catch { /* el store muestra el mensaje del servidor */ }
  }
  async function resend() {
    setNotice("");
    const result = await resendVerification();
    if (result) { setNotice(result.message); setCooldown(60); }
  }
  return (
    <AuthLayout subtitle="Verificación de contacto">
      <div className={authPanelClass}>
        <h2 className="text-xl font-semibold text-white mb-2">{phoneStep ? "Verificar teléfono" : "Verificar email"}</h2>
        <p className="text-gray-400 text-sm mb-4 break-words">Ingresa el código de seis dígitos de <span className="text-white">{phoneStep ? user?.phone : user?.email}</span>. Si tu instalación usa correo por consola, consulta el registro de la API.</p>
        {error && <p role="alert" className="rounded-lg p-3 mb-4 bg-red-500/10 text-red-400 text-sm">{error}</p>}
        {notice && !error && <p role="status" className="rounded-lg p-3 mb-4 bg-emerald-500/10 text-emerald-300 text-sm">{notice}</p>}
        <form onSubmit={submit} className="space-y-4">
          <label htmlFor="otp" className="block text-sm text-gray-300">{phoneStep ? "Código SMS" : "Código de correo"}</label>
          <input id="otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); clearError(); }} maxLength={6} placeholder="000000" required
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.3em] font-mono" />
          <button type="submit" disabled={isLoading} className="w-full bg-[#00d4aa] hover:bg-[#00b894] disabled:opacity-50 text-black font-semibold py-3 rounded-xl">
            {isLoading ? "Verificando…" : phoneStep ? "Verificar teléfono" : "Verificar email"}
          </button>
        </form>
        <button type="button" disabled={cooldown > 0 || isLoading} onClick={() => void resend()} className="w-full mt-3 text-sm text-gray-400 disabled:opacity-40">
          {cooldown > 0 ? `Puedes reenviar en ${cooldown}s` : "Reenviar código"}
        </button>
        <button type="button" disabled={isLoading} onClick={() => void logout().then(() => navigate("/login", { replace: true })).catch(() => {})} className="w-full mt-3 text-sm text-gray-400 hover:text-white">Cerrar sesión</button>
      </div>
    </AuthLayout>
  );
}
