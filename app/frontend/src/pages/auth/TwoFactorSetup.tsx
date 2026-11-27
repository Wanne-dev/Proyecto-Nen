import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck } from "lucide-react";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { useAuthStore } from "../../store/auth.slice";
import { useUIStore } from "../../store/ui.slice";
import { authService, type TotpEnrollment } from "../../services/auth";
import { C } from "../../theme";

export default function TwoFactorSetup() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const toast = useUIStore((state) => state.toast);
  const [pending, setPending] = useState<TotpEnrollment | null>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      if (!pending) { setPending(await authService.setup2FA(password)); setPassword(""); }
      else {
        const { user: updated } = await authService.confirm2FA(code);
        setPending(null); setCode(""); setUser(updated);
        toast("success", "2FA activado", "Las demás sesiones se cerraron.");
        navigate("/settings/security", { replace: true });
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo completar la configuración"); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: 460, margin: "0 auto", padding: "0 0 24px" }}>
      <Link style={{ color: C.t2, fontSize: 13 }} to="/settings/security">← Volver a Seguridad</Link>
      <div style={{ height: 12 }} />
      <Card title="Configura 2FA" subtitle="Usa una aplicación autenticadora compatible con TOTP.">
        {user?.twoFactorEnabled ? <p style={{ color: C.green }}>2FA ya está activado para esta cuenta.</p> : (
          <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
            {error && <p role="alert" style={{ color: C.red }}>{error}</p>}
            {!pending ? (
              <Input label="Contraseña actual" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            ) : (
              <>
                <p style={{ color: C.t2, fontSize: 13 }}>Escanea el QR. La configuración vence a los 10 minutos y 2FA solo se activa tras confirmar un código válido.</p>
                <div style={{ width: "fit-content", margin: "auto", padding: 12, borderRadius: 8, background: "white" }}>
                  <QRCodeSVG value={pending.otpauthUrl} size={164} title="Código QR para configurar TOTP" />
                </div>
                <p style={{ color: C.t3, fontSize: 12 }}>Si no puedes escanearlo, introduce esta clave manualmente. No la compartas.</p>
                <code data-testid="totp-setup-secret" style={{ color: C.gold, overflowWrap: "anywhere" }}>{pending.secret}</code>
                <Input label="Código de la aplicación" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
              </>
            )}
            <Button type="submit" variant="success" icon={<ShieldCheck size={15} />} disabled={busy}>{busy ? "Validando…" : pending ? "Confirmar y activar 2FA" : "Generar código QR"}</Button>
            {pending && <Button variant="outline" type="button" disabled={busy} onClick={() => { setPending(null); setCode(""); setError(""); }}>Empezar de nuevo</Button>}
          </form>
        )}
      </Card>
    </div>
  );
}
