import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound, Monitor, ShieldCheck } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { authService } from "../../services/auth";
import { useAuthStore } from "../../store/auth.slice";
import { useUIStore } from "../../store/ui.slice";
import type { UserSession } from "../../types/User.types";
import { C, fmtDate } from "../../theme";

const form = { display: "grid", gap: 12, width: "100%", maxWidth: 420 };
const err = (error: unknown) => error instanceof Error ? error.message : "No se pudo completar la solicitud";

export default function Security() {
  const { user, setUser, endLocally } = useAuthStore();
  const toast = useUIStore((state) => state.toast);
  const navigate = useNavigate();
  const [query] = useSearchParams();
  const [sessions, setSessions] = useState<UserSession[] | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disableError, setDisableError] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [changeCode, setChangeCode] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadSessions() {
    setLoadingSessions(true); setSessionError("");
    try { setSessions(await authService.listSessions()); }
    catch (error) { setSessionError(err(error)); }
    finally { setLoadingSessions(false); }
  }
  useEffect(() => { void loadSessions(); }, [user?.id]);

  async function revoke(id?: string) {
    setSessionBusy(true); setSessionError("");
    try {
      if (id) await authService.revokeSession(id);
      else await authService.revokeOtherSessions();
      await loadSessions();
      toast("success", id ? "Sesión cerrada" : "Otras sesiones cerradas");
    } catch (error) { setSessionError(err(error)); }
    finally { setSessionBusy(false); }
  }
  function closeDisable() { setDisableOpen(false); setDisablePassword(""); setDisableCode(""); setDisableError(""); }
  async function disable(event: FormEvent) {
    event.preventDefault(); setBusy(true); setDisableError("");
    try {
      const { user: updated } = await authService.disable2FA(disablePassword, disableCode);
      setUser(updated); closeDisable(); await loadSessions();
      toast("success", "2FA desactivado", "Se cerraron las demás sesiones.");
    } catch (error) { setDisableError(err(error)); }
    finally { setBusy(false); }
  }
  async function change(event: FormEvent) {
    event.preventDefault(); setPasswordError("");
    if (next !== confirm) { setPasswordError("Las contraseñas nuevas no coinciden"); return; }
    setBusy(true);
    try {
      await authService.changePassword(current, next, user?.twoFactorEnabled ? changeCode : undefined);
      endLocally(); navigate("/login", { replace: true, state: { passwordChanged: true } });
    } catch (error) { setPasswordError(err(error)); }
    finally { setBusy(false); }
  }
  const totpInput = (label: string, value: string, set: (value: string) => void) => (
    <Input label={label} hint="Si acabas de usar el código actual, espera al siguiente." value={value}
      inputMode="numeric" maxLength={6} pattern="[0-9]{6}" autoComplete="one-time-code" required onChange={(e) => set(e.target.value.replace(/\D/g, ""))} />
  );

  return (
    <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
      <PageHeader title="Seguridad" subtitle="Autenticación y sesiones de tu cuenta" icon={<ShieldCheck size={19} color={C.blue} />} />
      {query.has("staff") && !user?.twoFactorEnabled && <p role="status" style={{ color: C.gold }}>Configura 2FA para usar el panel de personal.</p>}
      <Card title="Autenticación en dos pasos" subtitle="Si activas 2FA, necesitarás un código TOTP al iniciar sesión.">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <Badge tone={user?.twoFactorEnabled ? "green" : "gold"}>{user?.twoFactorEnabled ? "2FA activo" : "2FA inactivo"}</Badge>
          {user?.twoFactorEnabled ? (
            <Button variant="outline" disabled={busy} onClick={() => disableOpen ? closeDisable() : setDisableOpen(true)}>{disableOpen ? "Cancelar" : "Desactivar 2FA"}</Button>
          ) : <Link to="/2fa-setup" style={{ color: C.green, fontWeight: 700, fontSize: 14 }}>Configurar 2FA →</Link>}
        </div>
        {disableOpen && <form onSubmit={disable} style={{ ...form, marginTop: 14 }}>
          <p style={{ color: C.t2, fontSize: 13 }}>Confirma con tu contraseña y un código nuevo. Esta acción cierra las otras sesiones.</p>
          {disableError && <p role="alert" style={{ color: C.red }}>{disableError}</p>}
          <Input label="Contraseña para desactivar" type="password" autoComplete="current-password" required value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} />
          {totpInput("Código TOTP para desactivar", disableCode, setDisableCode)}
          <Button type="submit" variant="danger" disabled={busy}>Confirmar desactivación</Button>
        </form>}
      </Card>
      <Card title="Sesiones activas" subtitle="Navegadores conectados según el servidor. Puedes cerrar sesiones que no reconozcas.">
        {sessionError && <p role="alert" style={{ color: C.red, marginBottom: 10 }}>{sessionError}</p>}
        {loadingSessions ? <p role="status">Cargando sesiones…</p> : sessions?.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {sessions.map((session) => (
              <div key={session.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: 10, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                <Monitor color={C.blue} size={16} />
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ fontSize: 12, overflowWrap: "anywhere" }}>{session.device}</div>
                  <div style={{ fontSize: 11, color: C.t3 }}>Creada: {fmtDate(session.createdAt)} · Vence: {fmtDate(session.expiresAt)}</div>
                  {session.lastActiveAt && <div style={{ fontSize: 11, color: C.t3 }}>Última emisión o renovación: {fmtDate(session.lastActiveAt)}</div>}
                </div>
                {session.isCurrent ? <Badge tone="green">Esta sesión</Badge> : <Button variant="outline" size="sm" disabled={sessionBusy} onClick={() => void revoke(session.id)}>Cerrar esta sesión</Button>}
              </div>
            ))}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Button variant="outline" disabled={sessionBusy} onClick={() => void loadSessions()}>Actualizar lista</Button>
              <Button variant="outline" disabled={sessionBusy || !sessions.some((s) => !s.isCurrent)} onClick={() => void revoke()}>Cerrar otras sesiones</Button>
            </div>
          </div>
        ) : <Button variant="outline" onClick={() => void loadSessions()}>Volver a consultar sesiones</Button>}
      </Card>
      <Card title="Cambiar contraseña" subtitle="Al guardar se cierran todas tus sesiones, incluida esta.">
        <form onSubmit={change} style={form}>
          {passwordError && <p role="alert" style={{ color: C.red }}>{passwordError}</p>}
          <Input label="Contraseña actual" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          <Input label="Contraseña nueva" type="password" autoComplete="new-password" minLength={8} required value={next} onChange={(e) => setNext(e.target.value)} />
          <Input label="Repetir contraseña nueva" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {user?.twoFactorEnabled && totpInput("Código TOTP para cambiar la contraseña", changeCode, setChangeCode)}
          <Button type="submit" variant="success" icon={<KeyRound size={14} />} disabled={busy}>Cambiar contraseña</Button>
        </form>
      </Card>
    </div>
  );
}
