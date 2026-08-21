/* Página de Ajustes / Perfil — BANCA NEN */
import { useState } from "react";
import { Settings as SettingsIcon, Save, BadgeCheck, Camera, ShieldCheck, Languages, Bell, Globe } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Toggle from "../../components/ui/Toggle";
import Badge from "../../components/ui/Badge";
import { useAuthStore } from "../../store/auth.slice";
import { useUIStore } from "../../store/ui.slice";
import { C, FONT } from "../../theme";

const KYC_LEVELS = [
  { level: 1, label: "Básico", desc: "Correo y teléfono verificados", done: true },
  { level: 2, label: "Intermedio", desc: "Documento de identidad validado", done: true },
  { level: 3, label: "Avanzado", desc: "Selfie + verificación biométrica", done: true },
];

export default function Settings() {
  const { user, updateProfile } = useAuthStore();
  const toast = useUIStore((s) => s.toast);
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    documentNumber: user?.documentNumber || "",
    country: user?.country || "Colombia",
  });
  const [prefs, setPrefs] = useState({
    emailNotif: true,
    smsNotif: true,
    pushNotif: true,
    marketAlerts: true,
    twoFactorRequired: true,
  });
  const [saving, setSaving] = useState(false);

  const saveProfile = () => {
    setSaving(true);
    setTimeout(() => {
      updateProfile({ ...form });
      setSaving(false);
      toast("success", "Perfil actualizado", "Tus datos se guardaron correctamente");
    }, 600);
  };

  const savePrefs = () => {
    toast("success", "Preferencias guardadas");
  };

  const field = (label: string, value: string, key: keyof typeof form, type = "text") => (
    <div style={{ flex: 1, minWidth: 180 }}>
      <Input label={label} type={type} value={value} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader title="Ajustes" subtitle="Administra tu perfil, preferencias y verificación KYC" icon={<SettingsIcon size={19} color={C.blue} />} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Perfil */}
          <Card title="Información personal" subtitle="Estos datos se usan para el KYC y las operaciones">
            <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: (user?.role === "admin" ? C.gold : C.green) + "26", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: user?.role === "admin" ? C.gold : C.green, border: "2px solid " + (user?.role === "admin" ? C.gold : C.green) + "44" }}>
                  {((user?.firstName?.[0] || "") + (user?.lastName?.[0] || "")).toUpperCase()}
                </div>
                <button
                  onClick={() => toast("info", "Foto de perfil", "Disponible en la app móvil con la cámara")}
                  style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", backgroundColor: C.gold, border: "2px solid " + C.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <Camera size={10} color="#0A0A0F" />
                </button>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.t1 }}>{user?.firstName} {user?.lastName}</div>
                <div style={{ fontSize: 10, color: C.t3 }}>{user?.email} · Miembro desde 2026</div>
                <div style={{ marginTop: 5, display: "flex", gap: 6 }}>
                  <Badge tone={user?.kycStatus === "verified" ? "green" : "gold"} icon={<BadgeCheck size={9} />}>KYC {user?.kycStatus?.toUpperCase() || "PENDING"}</Badge>
                  <Badge tone="blue" icon={<ShieldCheck size={9} />}>2FA {user?.twoFactorEnabled ? "activo" : "inactivo"}</Badge>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {field("Nombres", form.firstName, "firstName")}
              {field("Apellidos", form.lastName, "lastName")}
              {field("Email", form.email, "email", "email")}
              {field("Teléfono", form.phone, "phone", "tel")}
              {field("Documento", form.documentNumber, "documentNumber")}
              <div style={{ flex: 1, minWidth: 180 }}>
                <Input label="País" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <Button variant="success" size="md" icon={<Save size={13} />} onClick={saveProfile} disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </Card>

          {/* Preferencias */}
          <Card title="Preferencias de notificación" subtitle="Elige cómo quieres recibir alertas">
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                { key: "emailNotif", icon: <Bell size={13} color={C.blue} />, label: "Notificaciones por email", desc: "Resúmenes y confirmaciones de operaciones" },
                { key: "smsNotif", icon: <Bell size={13} color={C.gold} />, label: "Notificaciones SMS", desc: "Alertas críticas de seguridad por SMS" },
                { key: "pushNotif", icon: <Bell size={13} color={C.purple} />, label: "Notificaciones push", desc: "Alertas en tiempo real desde la app móvil" },
                { key: "marketAlerts", icon: <Bell size={13} color={C.green} />, label: "Alertas de mercado", desc: "Movimientos de precio de tus activos favoritos" },
                { key: "twoFactorRequired", icon: <ShieldCheck size={13} color={C.red} />, label: "Requerir 2FA en cada inicio de sesión", desc: "Máxima seguridad para tu cuenta" },
              ].map((item, i) => {
                const key = item.key as keyof typeof prefs;
                return (
                  <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 4 ? "1px solid " + C.border : "none" }}>
                    {item.icon}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.t1 }}>{item.label}</div>
                      <div style={{ fontSize: 9, color: C.t3 }}>{item.desc}</div>
                    </div>
                    <Toggle checked={prefs[key]} onChange={(v) => setPrefs({ ...prefs, [key]: v })} />
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <Button variant="outline" size="sm" onClick={savePrefs}>Guardar preferencias</Button>
            </div>
          </Card>
        </div>

        {/* KYC + idioma */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card title="Verificación de identidad" subtitle="Estado KYC">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {KYC_LEVELS.map((k) => (
                <div key={k.level} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 8, backgroundColor: C.bg2, border: "1px solid " + C.border }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", backgroundColor: k.done ? C.green : C.border, color: k.done ? "#0A0A0F" : C.t3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>
                    {k.done ? "✓" : k.level}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.t1 }}>{k.label}</div>
                    <div style={{ fontSize: 9, color: C.t3 }}>{k.desc}</div>
                  </div>
                  {k.done && <Badge tone="green">Completado</Badge>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 9, color: C.t3, lineHeight: 1.5 }}>
              Cumplimiento SARLAFT: tu documentación KYC está cifrada con AES-256-GCM y auditada.
            </div>
          </Card>

          <Card title="Idioma y región">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Languages size={14} color={C.t2} />
                <select style={{ flex: 1, padding: "8px 10px", fontSize: 11, borderRadius: 6, backgroundColor: C.card, border: "1px solid " + C.border, color: C.t1, outline: "none", fontFamily: FONT }}>
                  <option>Español (Latinoamérica)</option>
                  <option>English (US)</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Globe size={14} color={C.t2} />
                <select style={{ flex: 1, padding: "8px 10px", fontSize: 11, borderRadius: 6, backgroundColor: C.card, border: "1px solid " + C.border, color: C.t1, outline: "none", fontFamily: FONT }}>
                  <option>America/Bogota (UTC-5)</option>
                  <option>America/Mexico_City (UTC-6)</option>
                  <option>Europe/Madrid (UTC+2)</option>
                </select>
              </div>
            </div>
          </Card>

          <Card title="Cuenta" padded={false}>
            <button
              onClick={() => toast("info", "Descarga de datos", "Solicitada. Recibirás un correo con tus datos personales (RGPD/Ley 1581).")}
              style={{ ...linkRow }}
            >
              Descargar mis datos (portabilidad)
            </button>
            <button
              onClick={() => toast("warning", "Solicitud enviada", "Nuestro equipo revisará la eliminación de tu cuenta (máx. 72h).")}
              style={{ ...linkRow, color: C.red, borderTop: "1px solid " + C.border }}
            >
              Eliminar mi cuenta
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}

const linkRow: React.CSSProperties = {
  display: "flex", alignItems: "center", width: "100%", padding: "12px 14px",
  background: "none", border: "none", cursor: "pointer", color: C.t1, fontSize: 12,
  textAlign: "left", fontFamily: FONT,
};
