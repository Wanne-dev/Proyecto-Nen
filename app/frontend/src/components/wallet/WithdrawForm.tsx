import { useState } from "react";
import Button from "../ui/Button";
import { CURRENCY_DECIMALS, SUPPORTED_CURRENCIES } from "../../constants/currencies";
import type { WalletBalance } from "../../services/wallet";

interface Props {
  balances: WalletBalance[];
  onSubmit: (currency: string, amount: number) => Promise<void>;
  submitting?: boolean;
  initialCurrency?: string;
}

export default function WithdrawForm({ balances, onSubmit, submitting, initialCurrency = "USD" }: Props) {
  const [currency, setCurrency] = useState(initialCurrency);
  const [amount, setAmount] = useState("");
  const balance = balances.find((item) => item.currency === currency);
  const available = Math.max(0, (balance?.balance ?? 0) - (balance?.lockedAmount ?? 0));
  const digits = CURRENCY_DECIMALS[currency] ?? 2;
  const step = 10 ** -digits;
  const display = (value: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: digits }).format(value);
  const value = Number(amount);
  const multiplier = 10 ** digits;
  const fee = Math.round((value * 0.001 + Number.EPSILON) * multiplier) / multiplier;
  const debit = (Math.round(value * multiplier) + Math.round(fee * multiplier)) / multiplier;
  const insufficient = Math.round(debit * multiplier) > Math.round(available * multiplier);
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      if (value > 0 && !insufficient && !submitting) void onSubmit(currency, value);
    }} className="grid gap-4">
      <label htmlFor="withdraw-currency" className="grid gap-2 text-sm">
        Moneda
        <select id="withdraw-currency" disabled={submitting} className="bg-gray-900 border border-white/10 rounded-md p-3"
          value={currency} onChange={(event) => setCurrency(event.target.value)}>
          {SUPPORTED_CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
        </select>
      </label>
      <label htmlFor="withdraw-amount" className="grid gap-2 text-sm">
        Monto ({currency})
        <input id="withdraw-amount" required disabled={submitting} type="number" step={step} min={step} max="100000000"
          className="bg-black/20 border border-white/10 rounded-md p-3" placeholder="0.00"
          value={amount} onChange={(event) => setAmount(event.target.value)} />
      </label>
      <div className="rounded-md border border-white/10 p-3 text-sm text-gray-300 grid gap-1">
        <span>Disponible: {display(available)} {currency}</span>
        <span>Comisión estimada (0,1%): {display(fee)} {currency}</span>
        <strong>Débito estimado: {display(debit)} {currency}</strong>
      </div>
      {insufficient && <p role="status" className="text-sm text-red-400">El monto más la comisión supera el saldo disponible.</p>}
      <p className="text-sm text-gray-400">El retiro solo reduce el saldo de la billetera; no se hará un desembolso externo.</p>
      <Button type="submit" variant="danger" size="lg" fullWidth disabled={submitting || value <= 0 || insufficient}>
        {submitting ? "Registrando…" : "Retirar saldo"}
      </Button>
    </form>
  );
}
