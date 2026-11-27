import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Save, Settings as SettingsIcon } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { useAuthStore } from "../../store/auth.slice";
import api, { unwrap } from "../../api/client";
import type { User } from "../../types/User.types";
import { C } from "../../theme";

export default function Settings() {
  const { user, setUser } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setSaved(false);
    try {
      const { data } = await api.patch("/user/me", { firstName, lastName });
      const profile = unwrap<User>(data);
      setUser(profile); setFirstName(profile.firstName); setLastName(profile.lastName); setSaved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el perfil"); }
    finally { setBusy(false); }
  }
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <PageHeader title="Ajustes" subtitle="Perfil y preferencias" icon={<SettingsIcon size={19} color={C.blue} />} />
      <Card title="Información personal" subtitle="Solo los nombres se editan desde esta pantalla.">
        <form onSubmit={save} style={{ display: "grid", gap: 12, maxWidth: 440 }}>
          {error && <p role="alert" style={{ color: C.red }}>{error}</p>}
          {saved && <p role="status" style={{ color: C.green }}>Perfil guardado en el servidor.</p>}
          <Input label="Nombres" value={firstName} minLength={2} maxLength={100} required onChange={(e) => { setFirstName(e.target.value); setSaved(false); }} />
          <Input label="Apellidos" value={lastName} minLength={2} maxLength={100} required onChange={(e) => { setLastName(e.target.value); setSaved(false); }} />
          <Input label="Correo" value={user?.email ?? ""} readOnly />
          <Input label="Teléfono" value={user?.phone ?? ""} readOnly />
          <Button variant="success" type="submit" icon={<Save size={14} />} disabled={busy}>Guardar cambios</Button>
        </form>
      </Card>
      <Card title="Verificación y seguridad" subtitle="Comprobar un canal de contacto no equivale a comprobar identidad (KYC).">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <Badge tone={user?.emailVerified ? "green" : "gray"}>{user?.emailVerified ? "Correo verificado" : "Correo sin verificar"}</Badge>
          <Badge tone={user?.phoneVerified ? "green" : "gray"}>{user?.phoneVerified ? "Teléfono verificado" : "Teléfono sin verificar"}</Badge>
        </div>
        <p style={{ color: C.t3, fontSize: 13, marginBottom: 12 }}>No hay validación documental ni biométrica en este entorno. Usa solo datos ficticios.</p>
        <Link to="/settings/security" style={{ color: C.green, fontSize: 13 }}>Administrar seguridad de la cuenta →</Link>
      </Card>
    </div>
  );
}
