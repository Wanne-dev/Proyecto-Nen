import { useEffect, useState } from "react";
import { Save, ServerCog } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { adminService, type SystemSettings } from "../../services/admin";
import { C } from "../../theme";

export default function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true); setError("");
    try { const result = await adminService.getSettings(); setSettings(result); setAllowed(result.allowRegistration); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo consultar la configuración"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const save = async () => {
    setSaving(true); setError(""); setNotice("");
    try {
      const result = await adminService.saveSettings({ allowRegistration: allowed });
      setSettings(result); setAllowed(result.allowRegistration);
      setNotice(result.allowRegistration ? "Se habilitó el registro de nuevas cuentas." : "Se deshabilitó el registro de nuevas cuentas.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar la configuración"); }
    finally { setSaving(false); }
  };
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <PageHeader title="Configuración del sistema" subtitle="Controles efectivos del entorno académico" icon={<ServerCog size={19} color={C.blue} />} />
      <Card title="Registro de cuentas" subtitle="Cerrar el registro no afecta a cuentas ni sesiones existentes.">
        {error && <p role="alert" style={{ color: C.red, marginBottom: 12 }}>{error}</p>}
        {notice && <p role="status" style={{ color: C.green, marginBottom: 12 }}>{notice}</p>}
        {loading ? <p role="status">Cargando configuración…</p> : !settings ? <Button variant="outline" onClick={() => void load()}>Reintentar</Button> : (
          <div style={{ display: "grid", gap: 12, justifyItems: "start" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={allowed} disabled={saving} onChange={(e) => { setAllowed(e.target.checked); setNotice(""); }} /> Permitir nuevos registros
            </label>
            <Button variant="success" icon={<Save size={14} />} disabled={saving || allowed === settings.allowRegistration} onClick={() => void save()}>Guardar configuración</Button>
          </div>
        )}
      </Card>
      <Card title="Políticas de la plataforma" subtitle="No se modifican desde la interfaz.">
        <ul style={{ fontSize: 13, color: C.t2, display: "grid", gap: 8, padding: "0 0 0 16px", listStyle: "disc" }}>
          <li>El personal debe confirmar 2FA para entrar al panel.</li>
          <li>El acceso se renueva a los 15 minutos si la sesión sigue activa; las sesiones verificadas vencen como máximo en siete días.</li>
          <li>Los movimientos usan dinero virtual. Wompi permanece deshabilitado.</li>
          <li>Los cambios administrativos se incluyen en la auditoría verificable.</li>
        </ul>
      </Card>
    </div>
  );
}
