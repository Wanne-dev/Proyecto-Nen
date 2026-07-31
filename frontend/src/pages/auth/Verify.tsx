import { useState } from "react";
import { useAuthStore } from "../../store/auth.slice";
import { useNavigate } from "react-router-dom";

export default function Verify() {
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [step, setStep] = useState<"email" | "phone" | "done">("email");
  const { user, verifyEmailCode, verifyPhoneCode, resendVerification, isLoading, error, clearError, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleEmailVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await verifyEmailCode(emailCode);
      setEmailVerified(true);
      if (true) {
        setStep("done");
      } else {
        setStep("phone");
      }
    } catch {}
  };

  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await verifyPhoneCode(phoneCode);
      setPhoneVerified(true);
      setStep("done");
    } catch {}
  };

  const handleResend = async () => {
    await resendVerification();
  };

  if (step === "done") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-[#1a1a1a] rounded-2xl p-8 shadow-2xl border border-white/5">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Cuenta verificada</h2>
            <p className="text-gray-400 mb-6">Tu identidad ha sido confirmada. Ya puedes operar en BANCA NEN.</p>
            <button onClick={() => navigate("/login")} className="w-full bg-[#00d4aa] hover:bg-[#00b894] text-black font-semibold py-3 rounded-xl transition-colors">
              Iniciar sesion
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white tracking-tight">BANCA NEN</h1>
          <p className="text-gray-400 mt-1 text-sm">Verificacion de identidad</p>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-8 shadow-2xl border border-white/5">
          {/* Progress */}
          <div className="flex items-center gap-3 mb-8">
            <div className={`flex items-center gap-2 ${step === "email" ? "text-[#00d4aa]" : emailVerified ? "text-emerald-400" : "text-gray-500"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${emailVerified ? "bg-emerald-500/20" : step === "email" ? "bg-[#00d4aa]/20" : "bg-white/5"}`}>
                {emailVerified ? "?" : "1"}
              </div>
              <span className="text-sm">Email</span>
            </div>
            <div className={`flex-1 h-px ${emailVerified ? "bg-emerald-500/30" : "bg-white/10"}`} />
            <div className={`flex items-center gap-2 ${step === "phone" ? "text-[#00d4aa]" : phoneVerified ? "text-emerald-400" : "text-gray-500"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${phoneVerified ? "bg-emerald-500/20" : step === "phone" ? "bg-[#00d4aa]/20" : "bg-white/5"}`}>
                {phoneVerified ? "?" : "2"}
              </div>
              <span className="text-sm">Telefono</span>
            </div>
            <div className={`flex-1 h-px ${phoneVerified ? "bg-emerald-500/30" : "bg-white/10"}`} />
            <div className={`flex items-center gap-2 ${step === "done" ? "text-[#00d4aa]" : "text-gray-500"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === "done" ? "bg-[#00d4aa]/20" : "bg-white/5"}`}>3</div>
              <span className="text-sm">Listo</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {step === "email" && (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">Verificar email</h2>
              <p className="text-gray-400 text-sm mb-6">Enviamos un codigo de 6 digitos a <span className="text-white">{user?.email}</span></p>
              <form onSubmit={handleEmailVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Codigo de email</label>
                  <input type="text" value={emailCode} onChange={(e) => { setEmailCode(e.target.value); clearError(); }}
                    maxLength={6} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.5em] placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors font-mono"
                    placeholder="000000" required />
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-[#00d4aa] hover:bg-[#00b894] disabled:opacity-50 text-black font-semibold py-3 rounded-xl transition-colors">
                  {isLoading ? "Verificando..." : "Verificar email"}
                </button>
              </form>
              <button onClick={handleResend} className="w-full mt-3 text-sm text-gray-400 hover:text-[#00d4aa] transition-colors">
                No recibiste el codigo? Reenviar
              </button>
            </>
          )}

          {step === "phone" && (
            <>
              <h2 className="text-xl font-semibold text-white mb-2">Verificar telefono</h2>
              <p className="text-gray-400 text-sm mb-6">Enviamos un codigo de 6 digitos a <span className="text-white">{user?.phone}</span></p>
              <form onSubmit={handlePhoneVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Codigo de telefono</label>
                  <input type="text" value={phoneCode} onChange={(e) => { setPhoneCode(e.target.value); clearError(); }}
                    maxLength={6} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.5em] placeholder-gray-500 focus:outline-none focus:border-[#00d4aa] transition-colors font-mono"
                    placeholder="000000" required />
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-[#00d4aa] hover:bg-[#00b894] disabled:opacity-50 text-black font-semibold py-3 rounded-xl transition-colors">
                  {isLoading ? "Verificando..." : "Verificar telefono"}
                </button>
              </form>
              <button onClick={handleResend} className="w-full mt-3 text-sm text-gray-400 hover:text-[#00d4aa] transition-colors">
                No recibiste el codigo? Reenviar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
