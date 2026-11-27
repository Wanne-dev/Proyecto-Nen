import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PlusCircle, CheckCircle2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import DepositForm from "../../components/wallet/DepositForm";
import { useWalletStore } from "../../store/wallet.slice";
import { walletCurrencyOrDefault } from "../../constants/currencies";
import type { Transaction } from "../../services/wallet";

export default function Deposit() {
  const [params] = useSearchParams();
  const initialCurrency = walletCurrencyOrDefault(params.get("currency"));
  const deposit = useWalletStore((state) => state.deposit);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Transaction | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(currency: string, amount: number) {
    setSubmitting(true);
    setError("");
    try {
      setDone((await deposit(currency, amount)).transaction);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "No fue posible registrar el depósito.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Depósito" subtitle="Agrega saldo a tu billetera; no se realiza ningún cobro externo." icon={<PlusCircle size={19} />} />
      <Card title={done ? "Movimiento registrado" : "Cargar saldo"}>
        {done ? (
          <div className="grid gap-3 text-sm">
            <CheckCircle2 className="text-emerald-400" />
            <strong role="status">Depósito registrado</strong>
            <p>{done.amount} {done.currency} acreditados en tu billetera.</p>
            <p className="break-all text-gray-400">Referencia: {done.referenceId}</p>
            <div className="flex flex-wrap gap-4">
              <button className="text-emerald-300" onClick={() => setDone(null)}>Nuevo depósito</button>
              <Link className="text-sky-300" to="/wallet">Ver billetera</Link>
            </div>
          </div>
        ) : <DepositForm key={initialCurrency} initialCurrency={initialCurrency} onSubmit={handleSubmit} submitting={submitting} />}
        {error && <p role="alert" className="mt-3 text-red-400 text-sm">{error}</p>}
      </Card>
    </div>
  );
}
