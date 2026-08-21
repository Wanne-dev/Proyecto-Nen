/* Configuración del Sistema (admin) — BANCA NEN */
import { useEffect, useState } from "react";
import { ServerCog, Save, Globe2, ShieldCheck, Coins, AlertTriangle } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Toggle from "../../components/ui/Toggle";
import Badge from "../../components/ui/Badge";
import { adminService, type SystemSettings } from "../../services/admin";
import { useUIStore } from "../../store/ui.slice";
import { C, FONT } from "../../theme";

const DEFAULT_SETTINGS: SystemSettings = {
  platformName: "BANCA NEN",
  maintenanceMode: false,
  allowRegistration: true,
  kycRequired: true,
  defaultCurrency: "USD",
  maxWithdrawalDaily: 10000,
  maxDepositDaily: 50000,
  tradingFee: 0.001,
  withdrawalFee: 0.0015,
  minWithdrawal: 10,
  minDeposit: 5,
  minTradeUsd: 5,
  maxLeverage: 10,
  twoFactorRequired: true,
  sessionTimeoutMin: 30,
  suspiciousThreshold: 0.8,
  allowedCountries: ["Colombia", "México", "España", "Perú", "Chile", "Argentina", "Ecuador", "Panamá", "Estados Unidos"],
  languages: ["es", "en"],
  timezone: "America/Bogota",
  notifications: { email: true, sms: true, push: true, securityAlerts: true, marketAlerts: true },
};

export default function AdminSettings() {
  const toast = useUIStore((s) => s.toast);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCountry, setNewCountry] = useState("");

  useEffect(() => {
    adminService.getSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  const set = (patch: Partial<SystemSettings>) =>
    setSettings({ ...settings, ...patch });

  const setNum = (key: "maxWithdrawalDaily" | "maxDepositDaily" | "tradingFee" | "withdrawalFee" | "minWithdrawal" | "minDeposit" | "minTradeUsd" | "maxLeverage" | "sessionTimeoutMin" | "suspiciousThreshold", v: string) => {
    const n = parseFloat(v);
    if (!isNaN(n)) set({ [key]: n } as any);
  };

  const save = async () => {
    setSaving(true);
    await adminService.saveSettings(settings);
    setSaving(false);
    toast("success", "Configuración guardada", "Los cambios se aplicaron en toda la plataforma");
  };

  const addCountry = () => {
    if (!newCountry.trim()) return;
    set({ allowedCountries: [...settings.allowedCountries, newCountry.trim()] });
    setNewCountry("");
  };

  const removeCountry = (c: string) => set({ allowedCountries: settings.allowedCountries.filter((x) => x !== c) });

  const numField = (label: string, key: "maxWithdrawalDaily" | "maxDepositDaily" | "tradingFee" | "withdrawalFee" | "minWithdrawal" | "minDeposit" | "minTradeUsd" | "maxLeverage" | "sessionTimeoutMin" | "suspiciousThreshold", hint?: string) => (
    <div style={{ flex: 1, minWidth: 150 }}>
      <Input
        label={label}
        type="number"
        step="any"
        value={String(settings[key])}
        onChange={(e) => setNum(key, e.target.value)}
        hint={hint}
      />
    </div>
  );

  const toggleRow = (label: string, desc: string, key: "maintenanceMode" | "allowRegistration" | "kycRequired" | "twoFactorRequired") => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid " + C.border }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.t1 }}>{label}</div>
        <div style={{ fontSize: 9, color: C.t3 }}>{desc}</div>
      </div>
      <Toggle checked={settings[key]} onChange={(v) => set({ [key]: v } as any)} />
    </div>
  );

  if (loading) {
    return (
      <div>
        <PageHeader title="Configuración del Sistema" subtitle="Parámetros globales de la plataforma" icon={<ServerCog size={19} color={C.blue} />} />
        <div style={{ padding: 60, textAlign: "center", color: C.t3, fontSize: 12 }}>Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader
        title="Configuración del Sistema"
        subtitle="Límites, comisiones, países permitidos y políticas de seguridad"
        icon={<ServerCog size={19} color={C.blue} />}
        actions={<Button variant="success" size="sm" icon={<Save size={13} />} onClick={save} disabled={saving}>{saving ? "Guardando..." : "Guardar cambios"}</Button>}
      />

      {settings.maintenanceMode && (
        <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, backgroundColor: C.gold + "15", border: "1px solid " + C.gold, fontSize: 11, color: C.gold, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={14} /> ¡Atención! La plataforma está en modo mantenimiento. Los usuarios verán una pantalla de mantenimiento.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* General */}
          <Card title="General" subtitle="Identidad y disponibilidad de la plataforma">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Input label="Nombre de la plataforma" value={settings.platformName} onChange={(e) => set({ platformName: e.target.value })} />
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <Input label="Moneda por defecto" value={settings.defaultCurrency} onChange={(e) => set({ defaultCurrency: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <Input label="Zona horaria" value={settings.timezone} onChange={(e) => set({ timezone: e.target.value })} />
                </div>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              {toggleRow("Modo mantenimiento", "Deshabilita temporalmente el acceso de usuarios", "maintenanceMode")}
              {toggleRow("Registro abierto", "Permite crear cuentas nuevas", "allowRegistration")}
              {toggleRow("KYC obligatorio", "Exige verificación de identidad para operar", "kycRequired")}
              {toggleRow("2FA obligatorio", "Todos los usuarios deben activar doble factor", "twoFactorRequired")}
            </div>
          </Card>

          {/* Límites */}
          <Card title="Límites de operación" subtitle="Montos mínimos y máximos (USD)">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {numField("Depósito máx. diario", "maxDepositDaily", "USD por día")}
              {numField("Retiro máx. diario", "maxWithdrawalDaily", "USD por día")}
              {numField("Depósito mín.", "minDeposit", "USD")}
              {numField("Retiro mín.", "minWithdrawal", "USD")}
              {numField("Operación mín.", "minTradeUsd", "USD")}
              {numField("Apalancamiento máx.", "maxLeverage", "x")}
              {numField("Tiempo de sesión", "sessionTimeoutMin", "minutos")}
            </div>
          </Card>

          {/* Notificaciones */}
          <Card title="Notificaciones del sistema" subtitle="Canales habilitados">
            {(["email", "sms", "push", "securityAlerts", "marketAlerts"] as const).map((key) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid " + C.border }}>
                <span style={{ fontSize: 11, color: C.t1, textTransform: "capitalize" }}>{key === "securityAlerts" ? "Alertas de seguridad" : key === "marketAlerts" ? "Alertas de mercado" : key}</span>
                <Toggle checked={settings.notifications[key]} onChange={(v) => set({ notifications: { ...settings.notifications, [key]: v } })} />
              </div>
            ))}
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Comisiones */}
          <Card title="Comisiones" subtitle="Tasas aplicadas a las operaciones">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {numField("Comisión de trading", "tradingFee", "ej: 0.001 = 0.1%")}
              {numField("Comisión de retiro", "withdrawalFee", "ej: 0.0015 = 0.15%")}
              {numField("Umbral sospechoso", "suspiciousThreshold", "0.0 - 1.0 (SARLAFT)")}
            </div>
            <div style={{ marginTop: 10, fontSize: 9, color: C.t3, lineHeight: 1.5, display: "flex", gap: 6 }}>
              <ShieldCheck size={12} color={C.green} />
              Las comisiones se auditan en la cadena inmutable y se concilian diariamente con Wompi.
            </div>
          </Card>

          {/* Países */}
          <Card title="Países permitidos" subtitle="Restricción geográfica para registro y operación">
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
                placeholder="Agregar país..."
                style={{ flex: 1, padding: "8px 10px", fontSize: 12, borderRadius: 6, backgroundColor: C.card, border: "1px solid " + C.border, color: C.t1, outline: "none", fontFamily: FONT }}
                onKeyDown={(e) => { if (e.key === "Enter") addCountry(); }}
              />
              <Button variant="outline" size="sm" onClick={addCountry}>Agregar</Button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {settings.allowedCountries.map((c) => (
                <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 999, backgroundColor: C.card, border: "1px solid " + C.border, fontSize: 10, color: C.t1 }}>
                  <Globe2 size={10} color={C.blue} />
                  {c}
                  <button onClick={() => removeCountry(c)} style={{ background: "none", border: "none", cursor: "pointer", color: C.t3, fontSize: 11, padding: 0 }}>×</button>
                </span>
              ))}
            </div>
          </Card>

          {/* Seguridad */}
          <Card title="Políticas de seguridad" subtitle="Resumen del cumplimiento">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { t: "Cifrado de datos en reposo", d: "AES-256-GCM" },
                { t: "Cifrado en tránsito", d: "TLS 1.3" },
                { t: "Autenticación", d: "JWT RS256 + 2FA TOTP obligatorio" },
                { t: "Auditoría", d: "Hash encadenado en tablas críticas" },
                { t: "Pasarela de pagos", d: "Wompi · PCI DSS Level 1 · tokenización" },
                { t: "Anti-lavado", d: "SARLAFT · monitoreo transaccional en tiempo real" },
                { t: "Rate limiting", d: "Protección OWASP Top 10 + WAF" },
              ].map((x) => (
                <div key={x.t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Coins size={11} color={C.green} />
                  <span style={{ flex: 1, fontSize: 10, color: C.t1 }}>{x.t}</span>
                  <Badge tone="green">{x.d}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="success" size="md" icon={<Save size={13} />} onClick={save} disabled={saving}>
              {saving ? "Guardando..." : "Guardar toda la configuración"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
