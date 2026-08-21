/* Página de Seguridad — BANCA NEN */
import { useState } from "react";
import { Shield, KeyRound, Smartphone, Globe, Fingerprint, ShieldAlert, Plus, Trash2, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Toggle from "../../components/ui/Toggle";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { useAuthStore } from "../../store/auth.slice";
import { authService } from "../../services/auth";
import { useUIStore } from "../../store/ui.slice";
import { C, FONT, timeAgo } from "../../theme";
import type { UserSession, SecurityQuestion } from "../../types/User.types";

const INITIAL_SESSIONS: UserSession[] = [
  { id: "s1", device: "Windows · Chrome", browser: "Chrome 126", location: "Bogotá, Colombia", ip: "190.24.12.84", createdAt: new Date(Date.now() - 3600000 * 2).toISOString(), lastActiveAt: new Date(Date.now() - 1800000).toISOString(), isCurrent: true, isBlocked: false },
  { id: "s2", device: "iPhone 15 · Safari", browser: "Safari", location: "Medellín, Colombia", ip: "190.27.5.193", createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), lastActiveAt: new Date(Date.now() - 86400000 * 1).toISOString(), isCurrent: false, isBlocked: false },
  { id: "s3", device: "Android · Chrome", browser: "Chrome 125", location: "Bogotá, Colombia", ip: "191.96.44.7", createdAt: new Date(Date.now() - 86400000 * 12).toISOString(), lastActiveAt: new Date(Date.now() - 86400000 * 9).toISOString(), isCurrent: false, isBlocked: true },
];

export default function Security() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const toast = useUIStore((s) => s.toast);
  const nav = useNavigate();

  const [sessions, setSessions] = useState<UserSession[]>(INITIAL_SESSIONS);
  const [questions, setQuestions] = useState<SecurityQuestion[]>([
    { id: "q1", question: "¿Nombre de tu primera mascota?", updatedAt: new Date().toISOString() },
    { id: "q2", question: "¿Ciudad donde naciste?", updatedAt: new Date().toISOString() },
  ]);
  const [newQuestion, setNewQuestion] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(true);
  const [pass, setPass] = useState({ current: "", next: "", confirm: "" });

  const changePassword = () => {
    if (pass.next.length < 8) { toast("error", "Contraseña débil", "Mínimo 8 caracteres"); return; }
    if (pass.next !== pass.confirm) { toast("error", "Las contraseñas no coinciden"); return; }
    toast("success", "Contraseña actualizada", "Se cerraron las demás sesiones por seguridad");
    setPass({ current: "", next: "", confirm: "" });
  };

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    setQuestions([...questions, { id: "q" + Date.now(), question: newQuestion.trim(), updatedAt: new Date().toISOString() }]);
    setNewQuestion("");
    toast("success", "Pregunta agregada");
  };

  const revokeSession = (id: string) => {
    setSessions(sessions.filter((s) => s.id !== id));
    toast("info", "Sesión cerrada", "El dispositivo fue desconectado");
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", fontSize: 12, borderRadius: 6, backgroundColor: C.card,
    border: "1px solid " + C.border, color: C.t1, outline: "none", fontFamily: FONT,
  };

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader title="Seguridad" subtitle="2FA, contraseña, sesiones activas y preguntas de seguridad" icon={<Shield size={19} color={C.red} />} />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* 2FA */}
        <Card
          title="Autenticación de dos factores (2FA)"
          subtitle="TOTP con Google Authenticator / Authy"
          action={<Badge tone={user?.twoFactorEnabled ? "green" : "gold"}>{user?.twoFactorEnabled ? "ACTIVADO" : "INACTIVO"}</Badge>}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 44, height: 44, borderRadius: 11, backgroundColor: C.green + "1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <KeyRound size={19} color={C.green} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>
                {user?.twoFactorEnabled
                  ? "Tu cuenta está protegida con códigos TOTP que cambian cada 30 segundos. Es obligatorio para retiros."
                  : "Activa 2FA para proteger tu cuenta. El 2FA es obligatorio para retiros y operaciones de alto valor."}
              </div>
            </div>
            <Button
              variant={user?.twoFactorEnabled ? "outline" : "success"}
              size="sm"
              icon={<QrCode size={13} />}
              onClick={() => user?.twoFactorEnabled ? setConfirmModal(true) : nav("/2fa-setup")}
            >
              {user?.twoFactorEnabled ? "Desactivar" : "Configurar 2FA"}
            </Button>
          </div>
        </Card>

        {/* Contraseña */}
        <Card title="Cambiar contraseña" subtitle="Usa una contraseña única de al menos 8 caracteres">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <Input type="password" label="Contraseña actual" value={pass.current} onChange={(e) => setPass({ ...pass, current: e.target.value })} placeholder="••••••••" />
            <Input type="password" label="Nueva contraseña" value={pass.next} onChange={(e) => setPass({ ...pass, next: e.target.value })} placeholder="Mínimo 8 caracteres" />
            <Input type="password" label="Confirmar nueva" value={pass.confirm} onChange={(e) => setPass({ ...pass, confirm: e.target.value })} placeholder="Repite la nueva" />
          </div>
          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <Button variant="primary" size="sm" onClick={changePassword}>Actualizar contraseña</Button>
          </div>
        </Card>

        {/* Sesiones */}
        <Card
          title="Sesiones activas"
          subtitle="Dispositivos con acceso a tu cuenta"
          action={<Badge tone="blue">{sessions.length} sesiones</Badge>}
          padded={false}
        >
          {sessions.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: "1px solid " + C.border }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: s.isBlocked ? C.red + "1A" : C.blue + "1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Smartphone size={15} color={s.isBlocked ? C.red : C.blue} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, color: C.t1 }}>
                  {s.device}
                  {s.isCurrent && <Badge tone="green">Esta sesión</Badge>}
                  {s.isBlocked && <Badge tone="red"><ShieldAlert size={9} /> Bloqueada</Badge>}
                </div>
                <div style={{ fontSize: 9, color: C.t3 }}>
                  {s.location} · {s.ip} · activa {timeAgo(s.lastActiveAt)}
                </div>
              </div>
              {!s.isCurrent && (
                <button onClick={() => revokeSession(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.t3, display: "flex", padding: 6 }} title="Cerrar sesión">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <div style={{ padding: 10, display: "flex", justifyContent: "flex-end" }}>
            <Button variant="danger" size="xs" onClick={() => { setSessions(sessions.filter((s) => s.isCurrent)); toast("warning", "Sesiones cerradas", "Se cerraron todas las demás sesiones"); }}>
              Cerrar todas las demás
            </Button>
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* Preguntas de seguridad */}
          <Card title="Preguntas de seguridad" subtitle="Usadas para recuperar tu cuenta y validar retiros" padded={false}>
            <div style={{ padding: "6px 14px" }}>
              {questions.map((q) => (
                <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid " + C.border }}>
                  <Globe size={13} color={C.gold} />
                  <span style={{ flex: 1, fontSize: 11, color: C.t1 }}>{q.question}</span>
                  <button
                    onClick={() => { setQuestions(questions.filter((x) => x.id !== q.id)); toast("info", "Pregunta eliminada"); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: C.t3, display: "flex" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 14px", display: "flex", gap: 8 }}>
              <input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Nueva pregunta de seguridad..." style={fieldStyle} />
              <Button variant="outline" size="sm" icon={<Plus size={12} />} onClick={addQuestion}>Agregar</Button>
            </div>
          </Card>

          {/* Biometría */}
          <Card title="Biometría" subtitle="Disponible en la app móvil (huella / Face ID)" padded={false}>
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: C.purple + "1F", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Fingerprint size={17} color={C.purple} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>Desbloqueo biométrico</div>
                <div style={{ fontSize: 9, color: C.t3 }}>Inicia sesión con huella o Face ID desde tu dispositivo</div>
              </div>
              <Toggle checked={bioEnabled} onChange={(v) => { setBioEnabled(v); toast("success", v ? "Biometría activada" : "Biometría desactivada"); }} />
            </div>
            <div style={{ padding: "4px 14px 12px", fontSize: 9, color: C.t3 }}>
              Los datos biométricos nunca salen del dispositivo (Secure Enclave / Keychain).
            </div>
          </Card>
        </div>
      </div>

      {/* Modal confirmar desactivar 2FA */}
      <Modal open={confirmModal} onClose={() => setConfirmModal(false)} title="¿Desactivar 2FA?" subtitle="Esto reduce la seguridad de tu cuenta">
        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6 }}>
          Si desactivas la autenticación de dos factores, tu cuenta quedará más expuesta. Los retiros seguirán requiriendo
          biometría y preguntas de seguridad. ¿Deseas continuar?
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <Button variant="outline" size="sm" onClick={() => setConfirmModal(false)}>Cancelar</Button>
          <Button
            variant="danger" size="sm"
            onClick={async () => {
              setConfirmModal(false);
              try {
                await authService.disable2FA();
                if (user) setUser({ ...user, twoFactorEnabled: false });
                toast("warning", "2FA desactivado", "Te recomendamos reactivarlo pronto");
              } catch (e: any) {
                toast("error", "No se pudo desactivar 2FA", e?.message);
              }
            }}
          >
            Sí, desactivar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
