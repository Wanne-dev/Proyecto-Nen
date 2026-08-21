/* Formulario de depósito — BANCA NEN */
import { useState } from "react";
import { CreditCard, Landmark, Zap } from "lucide-react";
import Button from "../ui/Button";
import { C, FONT, fmt } from "../../theme";
import { getCurrencyMeta } from "../../constants/currencies";

interface Props {
  onSubmit: (currency: string, amount: number, method: string) => Promise<void>;
  submitting?: boolean;
}

const METHODS = [
  { id: "pse", label: "PSE (Banco)", icon: Landmark, desc: "Pago desde tu banco colombiano" },
  { id: "card", label: "Tarjeta", icon: CreditCard, desc: "Visa / Mastercard tokenizada (PCI DSS)" },
  { id: "crypto", label: "Cripto", icon: Zap, desc: "Transferencia de BTC / ETH / USDC" },
];

export default function DepositForm({ onSubmit, submitting }: Props) {
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("pse");

  const amtN = parseFloat(amount) || 0;
  const meta = getCurrencyMeta(currency);

  const quickAmounts = [50, 100, 250, 500, 1000];

  const submit = () => {
    if (amtN <= 0) return;
    onSubmit(currency, amtN, method);
  };

  return (
    <div style={{ fontFamily: FONT, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Moneda */}
      <div>
        <label style={{ fontSize: 10, color: C.t3, fontWeight: 600, display: "block", marginBottom: 6 }}>Moneda a depositar</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["USD", "COP", "EUR", "USDC", "BTC", "ETH"].map((c) => {
            const m = getCurrencyMeta(c);
            const active = currency === c;
            return (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                style={{
                  padding: "7px 12px", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: "pointer",
                  backgroundColor: active ? C.gold : C.card, color: active ? "#0A0A0F" : C.t2,
                  border: "1px solid " + (active ? C.gold : C.border), fontFamily: FONT,
                }}
              >
                {m.icon} {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Monto */}
      <div>
        <label style={{ fontSize: 10, color: C.t3, fontWeight: 600, display: "block", marginBottom: 6 }}>Monto</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: meta.color, fontSize: 14, fontWeight: 700 }}>{meta.icon}</span>
            <input
              type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00" autoFocus
              style={{ width: "100%", padding: "12px 12px 12px 30px", fontSize: 16, borderRadius: 8, backgroundColor: C.card, border: "1px solid " + C.border, color: C.t1, outline: "none", fontFamily: FONT }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 6 }}>
          {quickAmounts.map((a) => (
            <button key={a} onClick={() => setAmount(String(a))} style={{ padding: "4px 10px", fontSize: 9, backgroundColor: C.card, border: "1px solid " + C.border, color: C.t2, borderRadius: 5, cursor: "pointer", fontFamily: FONT }}>
              {fmt(a, 0)}
            </button>
          ))}
        </div>
        {amtN > 0 && (
          <div style={{ marginTop: 6, fontSize: 10, color: C.t3 }}>
            Equivalente: ≈ <span style={{ color: C.t1, fontWeight: 600 }}>{fmt(amtN * meta.usdRate)} USD</span>
          </div>
        )}
      </div>

      {/* Método */}
      <div>
        <label style={{ fontSize: 10, color: C.t3, fontWeight: 600, display: "block", marginBottom: 6 }}>Método de pago</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {METHODS.map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                  backgroundColor: active ? C.card : C.bg2, border: "1px solid " + (active ? C.gold + "66" : C.border), textAlign: "left", fontFamily: FONT,
                }}
              >
                <span style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: active ? C.gold + "1F" : C.border + "44", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={14} color={active ? C.gold : C.t3} />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{m.label}</div>
                  <div style={{ fontSize: 9, color: C.t3 }}>{m.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nota seguridad */}
      <div style={{ padding: "9px 12px", borderRadius: 8, backgroundColor: C.blue + "0F", border: "1px solid " + C.blue + "33", fontSize: 10, color: C.t2, lineHeight: 1.5 }}>
        🔒 <strong style={{ color: C.t1 }}>Wompi (pasarela PCI DSS Level 1)</strong> procesa el pago con tokenización.
        Nunca compartas tu tarjeta por otro medio. En modo demo no se realiza ningún cobro real.
      </div>

      <Button variant="success" size="lg" fullWidth onClick={submit} disabled={submitting || amtN <= 0}>
        {submitting ? "Procesando con Wompi..." : "Depositar " + (amtN > 0 ? fmt(amtN) : "")}
      </Button>
    </div>
  );
}
