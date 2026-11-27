import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MinusCircle } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import WithdrawForm from "../../components/wallet/WithdrawForm";
import { useWalletStore } from "../../store/wallet.slice";
import { walletCurrencyOrDefault } from "../../constants/currencies";
import type { Transaction } from "../../services/wallet";

export default function Withdraw() {
  const [params] = useSearchParams();
  const initialCurrency = walletCurrencyOrDefault(params.get("currency"));
  const { wallet, refresh, withdraw } = useWalletStore();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Transaction | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void refresh(); }, [refresh]);

  async function handleSubmit(currency: string, amount: number) {
    setSubmitting(true);
    setError("");
    try {
      setDone((await withdraw(currency, amount)).transaction);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "No fue posible registrar el retiro.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Retiro" subtitle="No se envían fondos a un banco ni a una billetera externa." icon={<MinusCircle size={19} />} />
      <Card title={done ? "Movimiento registrado" : "Retirar saldo"}>
        {done ? (
          <div className="grid gap-3 text-sm">
            <strong role="status">Retiro registrado</strong>
            <p>Se descontaron {done.amount} {done.currency} más {done.fee} {done.feeCurrency} de comisión.</p>
            <p className="break-all text-gray-400">Referencia: {done.referenceId}</p>
            <div className="flex flex-wrap gap-4">
              <button className="text-emerald-300" onClick={() => setDone(null)}>Nuevo retiro</button>
              <Link className="text-sky-300" to="/wallet">Ver billetera</Link>
            </div>
          </div>
        ) : <WithdrawForm key={initialCurrency} initialCurrency={initialCurrency} balances={wallet?.balances ?? []} onSubmit={handleSubmit} submitting={submitting} />}
        {error && <p role="alert" className="mt-3 text-red-400 text-sm">{error}</p>}
      </Card>
    </div>
  );
}
