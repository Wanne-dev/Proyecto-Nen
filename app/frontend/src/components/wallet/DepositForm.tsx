import { useState } from "react";
import { Coins } from "lucide-react";
import Button from "../ui/Button";
import { C, FONT } from "../../theme";
import { CURRENCY_DECIMALS, getCurrencyMeta, SUPPORTED_CURRENCIES } from "../../constants/currencies";

interface Props {
  onSubmit: (currency: string, amount: number) => Promise<void>;
  submitting?: boolean;
  initialCurrency?: string;
}

export default function DepositForm({ onSubmit, submitting, initialCurrency = "USD" }: Props) {
  const [currency, setCurrency] = useState(initialCurrency);
  const [amount, setAmount] = useState("");
  const value = Number(amount);
  const step = 10 ** -(CURRENCY_DECIMALS[currency] ?? 2);
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      if (value > 0 && !submitting) void onSubmit(currency, value);
    }} style={{ fontFamily: FONT, display: "grid", gap: 16 }}>
      <div>
        <p style={{ color: C.t2, fontSize: 13, marginBottom: 8 }}>Moneda</p>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SUPPORTED_CURRENCIES.map((code) => (
            <button type="button" disabled={submitting} key={code} onClick={() => setCurrency(code)} aria-pressed={currency === code}
              className="px-3 py-2 rounded-md text-sm font-semibold border border-white/10"
              style={{ color: currency === code ? C.bg : C.t2, background: currency === code ? C.green : C.card }}>
              {getCurrencyMeta(code).icon} {code}
            </button>
          ))}
        </div>
      </div>
      <label htmlFor="deposit-amount" className="grid gap-2 text-sm">
        Monto ({currency})
        <input id="deposit-amount" required disabled={submitting} type="number" step={step} min={step} max="100000000"
          value={amount} placeholder="0.00" onChange={(event) => setAmount(event.target.value)}
          className="w-full bg-black/20 border border-white/10 rounded-md px-3 py-3" />
      </label>
      <p className="rounded-md border border-white/10 p-3 text-sm text-gray-300">
        Se acreditará saldo en tu billetera. No se usa una tarjeta, una cuenta bancaria ni una pasarela de pago.
      </p>
      <Button type="submit" variant="success" size="lg" fullWidth icon={<Coins size={16} />} disabled={submitting || value <= 0}>
        {submitting ? "Registrando…" : "Depositar saldo"}
      </Button>
    </form>
  );
}
