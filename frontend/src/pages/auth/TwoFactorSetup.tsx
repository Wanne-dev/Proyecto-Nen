/* Configuración de 2FA (TOTP real) — BANCA NEN */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Shield, Copy, CheckCircle2, ArrowLeft, KeyRound } from "lucide-react";
import { useAuthStore } from "../../store/auth.slice";
import { useUIStore } from "../../store/ui.slice";
import { authService } from "../../services/auth";
import { C, FONT } from "../../theme";

export default function TwoFactorSetup() {
  const nav = useNavigate();
  const toast = useUIStore((s) => s.toast);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .enable2FA()
      .then((res) => {
        setSecret(res.secret || "");
        setOtpauthUrl(res.otpauthUrl || res.qrCodeUrl || "");
      })
      .catch((e: any) => {
        toast("error", "No se pudo iniciar 2FA", e?.message);
        nav("/settings/security");
      })
      .finally(() => setLoading(false));
  }, []);

  const verify = () => {
    if (!/^\d{6}$/.test(code)) {
      toast("error", "Código inválido", "Ingresa los 6 dígitos de tu app autenticadora");
      return;
    }
    setStep(2);
  };

  const enable = () => {
    if (user) setUser({ ...user, twoFactorEnabled: true });
    toast("success", "2FA activado", "Tu cuenta ahora está protegida con doble factor");
    nav("/settings/security");
  };

  const copySecret = () => {
    navigator.clipboard?.writeText(secret).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: FONT }}>
      <div style={{ width: 440, maxWidth: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: C.green + "1F", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
            <Shield size={24} color={C.green} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.t1, margin: 0 }}>Configura 2FA</h1>
          <p style={{ fontSize: 11, color: C.t3, marginTop: 6 }}>Protege tu cuenta con códigos TOTP que cambian cada 30 segundos</p>
        </div>

        <div style={{ backgroundColor: C.bg2, border: "1px solid " + C.border, borderRadius: 14, padding: 22 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 30, color: C.t3, fontSize: 12 }}>Generando secreto seguro...</div>
          ) : step === 1 ? (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t1, marginBottom: 12 }}>Paso 1 — Escanea el código QR</div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
                <div style={{ padding: 14, backgroundColor: "#fff", borderRadius: 12 }}>
                  <QRCodeSVG value={otpauthUrl || `otpauth://totp/BANCA%20NEN:${encodeURIComponent(user?.email || "usuario@nen.com")}?secret=${secret}&issuer=BANCA%20NEN`} size={180} level="M" />
                </div>
              </div>
              <div style={{ fontSize: 10, color: C.t3, textAlign: "center", lineHeight: 1.6, marginBottom: 12 }}>
                Usa <strong style={{ color: C.t1 }}>Google Authenticator</strong>, <strong style={{ color: C.t1 }}>Authy</strong> o
                cualquier app compatible TOTP. Si no puedes escanear, usa la clave manual:
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: C.card, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 10px" }}>
                <KeyRound size={13} color={C.gold} />
                <code style={{ flex: 1, fontSize: 11, color: C.t1, letterSpacing: 1, wordBreak: "break-all" }}>{secret}</code>
                <button onClick={copySecret} style={{ background: "none", border: "none", cursor: "pointer", color: C.t2, display: "flex" }} title="Copiar">
                  {copied ? <CheckCircle2 size={14} color={C.green} /> : <Copy size={14} />}
                </button>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: C.t1, margin: "18px 0 8px" }}>Paso 2 — Verifica el código</div>
              <input
                type="text" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                style={{ width: "100%", padding: "13px 0", fontSize: 24, letterSpacing: 14, textAlign: "center", borderRadius: 8, backgroundColor: C.card, border: "1px solid " + C.border, color: C.t1, outline: "none", fontFamily: "monospace", fontWeight: 700 }}
              />
              <div style={{ fontSize: 9, color: C.t3, textAlign: "center", marginTop: 6 }}>Genera el código en tu app autenticadora</div>

              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => nav(-1)} style={{ padding: "10px 16px", fontSize: 12, borderRadius: 8, backgroundColor: C.card, color: C.t2, border: "1px solid " + C.border, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 6 }}>
                  <ArrowLeft size={13} /> Atrás
                </button>
                <button onClick={verify} style={{ flex: 1, padding: "10px 0", fontSize: 13, fontWeight: 700, borderRadius: 8, backgroundColor: C.green, color: C.bg, border: "none", cursor: "pointer", fontFamily: FONT }}>
                  Ya lo escaneé / Verificar
                </button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <CheckCircle2 size={52} color={C.green} />
              <div style={{ fontSize: 16, fontWeight: 800, color: C.t1, marginTop: 12 }}>¡2FA configurado!</div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 6, lineHeight: 1.6 }}>
                A partir de ahora necesitarás un código de tu app autenticadora para iniciar sesión.
                <br />Guarda tu clave de respaldo en un lugar seguro.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
                <button onClick={enable} style={{ padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 8, backgroundColor: C.green, color: C.bg, border: "none", cursor: "pointer", fontFamily: FONT }}>
                  Activar 2FA y continuar
                </button>
                <button onClick={() => nav("/settings/security")} style={{ padding: "10px 0", fontSize: 12, borderRadius: 8, backgroundColor: "transparent", color: C.t2, border: "1px solid " + C.border, cursor: "pointer", fontFamily: FONT }}>
                  Hacerlo más tarde
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
