/* Página de Retiro (seguridad máxima) — BANCA NEN */
import { useState } from "react";
import { MinusCircle, CheckCircle2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import WithdrawForm from "../../components/wallet/WithdrawForm";
import Spinner from "../../components/ui/Spinner";
import { useWalletStore } from "../../store/wallet.slice";
import { useUIStore } from "../../store/ui.slice";
import { C, FONT, fmt } from "../../theme";

export default function Withdraw() {
  const wallet = useWalletStore((s) => s.wallet);
  const withdraw = useWalletStore((s) => s.withdraw);
  const toast = useUIStore((s) => s.toast);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ currency: string; amount: number; reference: string } | null>(null);

  const balances: Record<string, number> = {};
  (wallet?.balances || []).forEach((b) => { balances[b.currency] = Number(b.balance); });

  const handleSubmit = async (currency: string, amount: number) => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1400));
    try {
      await withdraw(currency, amount, "Retiro a cuenta bancaria");
      setDone({ currency, amount, reference: "WDR-" + Math.random().toString(36).slice(2, 10).toUpperCase() });
    } catch (e: any) {
      toast("error", "Retiro fallido", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: FONT, maxWidth: 560 }}>
      <PageHeader
        title="Retirar Fondos"
        subtitle="Retiros con seguridad máxima: 2FA + biometría + pregunta de seguridad y auditoría inmutable"
        icon={<MinusCircle size={19} color={C.red} />}
      />

      {done ? (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "18px 0", gap: 10 }}>
            <CheckCircle2 size={48} color={C.green} />
            <div style={{ fontSize: 17, fontWeight: 800, color: C.t1 }}>Retiro en proceso</div>
            <div style={{ fontSize: 12, color: C.t2 }}>
              Se envió <strong style={{ color: C.red }}>{fmt(done.amount)} {done.currency}</strong> a tu cuenta bancaria.
              <br />El retiro quedará disponible en 1-2 días hábiles.
            </div>
            <div style={{ fontSize: 10, color: C.t3 }}>Referencia: {done.reference}</div>
            <button
              onClick={() => setDone(null)}
              style={{ marginTop: 10, padding: "9px 18px", fontSize: 12, fontWeight: 700, borderRadius: 7, backgroundColor: C.card, color: C.t1, border: "1px solid " + C.border, cursor: "pointer", fontFamily: FONT }}
            >
              Nuevo retiro
            </button>
          </div>
        </Card>
      ) : (
        <Card title="Nuevo retiro" subtitle="Verificación en 3 pasos">
          {submitting ? (
            <div style={{ padding: 40 }}>
              <Spinner size={30} label="Validando retiro con el sistema antifraude..." />
            </div>
          ) : (
            <WithdrawForm balances={balances} onSubmit={handleSubmit} submitting={submitting} />
          )}
        </Card>
      )}
    </div>
  );
}
