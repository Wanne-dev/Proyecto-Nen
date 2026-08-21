/* Formulario de retiro seguro (2FA + preguntas) — BANCA NEN */
import { useState } from "react";
import { ShieldCheck, Fingerprint, KeyRound } from "lucide-react";
import Button from "../ui/Button";
import { C, FONT, fmt } from "../../theme";
import { getCurrencyMeta } from "../../constants/currencies";
import { useBiometrics } from "../../hooks/useBiometrics";

interface Props {
  balances: Record<string, number>;
  onSubmit: (currency: string, amount: number) => Promise<void>;
  submitting?: boolean;
}

export default function WithdrawForm({ balances, onSubmit, submitting }: Props) {
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("Bancolombia · Ahorros · **** 4821");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [code2FA, setCode2FA] = useState("");
  const [questionAnswer, setQuestionAnswer] = useState("");
  const { verified: bioVerified, checking: bioChecking, authenticate: doBiometric } = useBiometrics();

  const amtN = parseFloat(amount) || 0;
  const meta = getCurrencyMeta(currency);
  const available = balances[currency] || 0;
  const maxPct = available > 0 ? Math.min(1, amtN / available) : 0;
  const over = amtN > available;
  const bankBalance = 54820.9; // saldo bancario simulado

  const canNext = step === 1 ? amtN > 0 && !over : step === 2 ? /^\d{6}$/.test(code2FA) : bioVerified && questionAnswer.trim().length > 2;

  const submit = () => {
    if (step < 3) { setStep((s) => (s + 1) as 1 | 2 | 3); return; }
    onSubmit(currency, amtN);
  };

  return (
    <div style={{ fontFamily: FONT, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stepper */}
      <div style={{ display: "flex", gap: 6 }}>
        {["Datos", "Verificación 2FA", "Confirmación"].map((label, i) => (
          <div key={label} style={{ flex: 1, padding: "7px 6px", borderRadius: 7, textAlign: "center", fontSize: 9, fontWeight: 700, backgroundColor: step >= i + 1 ? C.gold + "1F" : C.bg2, color: step >= i + 1 ? C.gold : C.t3, border: "1px solid " + (step >= i + 1 ? C.gold + "55" : C.border) }}>
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {/* PASO 1: datos */}
      {step === 1 && (
        <>
          <div>
            <label style={{ fontSize: 10, color: C.t3, fontWeight: 600, display: "block", marginBottom: 6 }}>Moneda a retirar</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.keys(balances).map((c) => {
                const m = getCurrencyMeta(c);
                const active = currency === c;
                const bal = balances[c] || 0;
                return (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    style={{
                      padding: "7px 10px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer",
                      backgroundColor: active ? C.gold : C.card, color: active ? "#0A0A0F" : C.t2,
                      border: "1px solid " + (active ? C.gold : C.border), fontFamily: FONT,
                    }}
                  >
                    {m.icon} {c} · {bal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 10, color: C.t3, fontWeight: 600, display: "block", marginBottom: 6 }}>Monto</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: meta.color, fontSize: 14, fontWeight: 700 }}>{meta.icon}</span>
              <input type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00"
                style={{ width: "100%", padding: "12px 12px 12px 30px", fontSize: 16, borderRadius: 8, backgroundColor: C.card, border: "1px solid " + (over ? C.red : C.border), color: C.t1, outline: "none", fontFamily: FONT }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10 }}>
              <span style={{ color: C.t3 }}>
                Disponible: <strong style={{ color: C.t1 }}>{meta.icon} {available.toLocaleString()}</strong>
              </span>
              {over && <span style={{ color: C.red, fontWeight: 700 }}>Monto excede saldo</span>}
              {!over && amtN > 0 && <span style={{ color: C.t2 }}>≈ {fmt(amtN * meta.usdRate)} USD</span>}
            </div>
            {maxPct > 0.9 && (
              <div style={{ marginTop: 4, fontSize: 9, color: C.gold }}>Retiras el {Math.round(maxPct * 100)}% de tu saldo — operación marcada como de alto riesgo (SARLAFT)</div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 10, color: C.t3, fontWeight: 600, display: "block", marginBottom: 6 }}>Cuenta destino</label>
            <select value={account} onChange={(e) => setAccount(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, backgroundColor: C.card, border: "1px solid " + C.border, color: C.t1, fontSize: 12, fontFamily: FONT, outline: "none" }}>
              <option>Bancolombia · Ahorros · **** 4821</option>
              <option>Bancolombia · Corriente · **** 1130</option>
              <option>Nequi · **** 4567</option>
              <option>Daviplata · **** 8890</option>
            </select>
          </div>
        </>
      )}

      {/* PASO 2: 2FA */}
      {step === 2 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, backgroundColor: C.card, border: "1px solid " + C.border }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: C.blue + "1F", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <KeyRound size={17} color={C.blue} />
            </span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>Código TOTP de 6 dígitos</div>
              <div style={{ fontSize: 9, color: C.t3 }}>Ingresa el código de tu app autenticadora (Google Authenticator / Authy)</div>
            </div>
          </div>
          <input
            type="text" maxLength={6} value={code2FA} onChange={(e) => setCode2FA(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            style={{ width: "100%", padding: "14px 0", fontSize: 24, letterSpacing: 14, textAlign: "center", borderRadius: 8, backgroundColor: C.card, border: "1px solid " + C.border, color: C.t1, outline: "none", fontFamily: "monospace", fontWeight: 700 }}
          />
          <div style={{ fontSize: 9, color: C.t3, textAlign: "center" }}>En demo, cualquier código de 6 dígitos es válido</div>
        </>
      )}

      {/* PASO 3: biometría + preguntas */}
      {step === 3 && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 14px", borderRadius: 10, backgroundColor: C.card, border: "1px solid " + C.border }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: (bioVerified ? C.green : C.purple) + "1F", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Fingerprint size={17} color={bioVerified ? C.green : C.purple} />
              </span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>Biometría</div>
                <div style={{ fontSize: 9, color: C.t3 }}>{bioVerified ? "Verificada correctamente" : "Confirma tu identidad con huella o Face ID"}</div>
              </div>
            </div>
            {!bioVerified && (
              <Button size="sm" variant="outline" onClick={doBiometric} disabled={bioChecking}>
                <ShieldCheck size={12} /> {bioChecking ? "Verificando..." : "Verificar"}
              </Button>
            )}
          </div>

          <div>
            <label style={{ fontSize: 10, color: C.t3, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Pregunta de seguridad: <span style={{ color: C.t1 }}>¿Nombre de tu primera mascota?</span>
            </label>
            <input
              type="text" value={questionAnswer} onChange={(e) => setQuestionAnswer(e.target.value)}
              placeholder="Escribe tu respuesta..."
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, backgroundColor: C.card, border: "1px solid " + C.border, color: C.t1, fontSize: 12, outline: "none", fontFamily: FONT }}
            />
          </div>
        </>
      )}

      {/* Resumen */}
      {amtN > 0 && step > 1 && (
        <div style={{ padding: "10px 12px", borderRadius: 8, backgroundColor: C.card, display: "flex", justifyContent: "space-between", fontSize: 11 }}>
          <span style={{ color: C.t3 }}>Retiro a {account}</span>
          <span style={{ fontWeight: 700, color: C.red }}>- {meta.icon} {amtN.toLocaleString()}</span>
        </div>
      )}

      <div style={{ padding: "9px 12px", borderRadius: 8, backgroundColor: C.red + "0D", border: "1px solid " + C.red + "33", fontSize: 10, color: C.t2, lineHeight: 1.5 }}>
        🛡️ <strong style={{ color: C.t1 }}>Retiro con seguridad máxima:</strong> 2FA + biometría + pregunta de seguridad. El sistema antifraude valida cada retiro en tiempo real y registra la operación en la auditoría inmutable.
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {step > 1 && <Button variant="outline" size="lg" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)} style={{ flex: 1 }}>Atrás</Button>}
        <Button variant="danger" size="lg" onClick={submit} disabled={!canNext || submitting} fullWidth={step === 1}>
          {submitting ? "Procesando retiro..." : step === 1 ? "Continuar a verificación" : step === 2 ? "Verificar código" : "Confirmar retiro"}
        </Button>
      </div>
    </div>
  );
}
