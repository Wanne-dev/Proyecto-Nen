/* Página de Depósito — BANCA NEN */
import { useState } from "react";
import { PlusCircle, CheckCircle2, ArrowRight } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import DepositForm from "../../components/wallet/DepositForm";
import Spinner from "../../components/ui/Spinner";
import { useWalletStore } from "../../store/wallet.slice";
import { useUIStore } from "../../store/ui.slice";
import { C, FONT, fmt } from "../../theme";

export default function Deposit() {
  const deposit = useWalletStore((s) => s.deposit);
  const toast = useUIStore((s) => s.toast);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ currency: string; amount: number; reference: string } | null>(null);

  const handleSubmit = async (currency: string, amount: number, method: string) => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    try {
      await deposit(currency, amount, "Depósito vía Wompi (" + method.toUpperCase() + ")");
      setDone({ currency, amount, reference: "DEP-" + Math.random().toString(36).slice(2, 10).toUpperCase() });
    } catch (e: any) {
      toast("error", "Depósito fallido", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: FONT, maxWidth: 560 }}>
      <PageHeader
        title="Depositar Fondos"
        subtitle="Añade saldo a tu billetera multi-moneda con Wompi (PSE, tarjeta tokenizada o cripto)"
        icon={<PlusCircle size={19} color={C.green} />}
      />

      {done ? (
        <Card>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "18px 0", gap: 10 }}>
            <CheckCircle2 size={48} color={C.green} />
            <div style={{ fontSize: 17, fontWeight: 800, color: C.t1 }}>¡Depósito exitoso!</div>
            <div style={{ fontSize: 12, color: C.t2 }}>
              Se acreditaron <strong style={{ color: C.green }}>{fmt(done.amount)} {done.currency}</strong> a tu billetera.
            </div>
            <div style={{ fontSize: 10, color: C.t3 }}>Referencia: {done.reference}</div>
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button
                onClick={() => setDone(null)}
                style={{ padding: "9px 18px", fontSize: 12, fontWeight: 700, borderRadius: 7, backgroundColor: C.card, color: C.t1, border: "1px solid " + C.border, cursor: "pointer", fontFamily: FONT }}
              >
                Otro depósito
              </button>
              <a
                href="#/wallet"
                onClick={(e) => { e.preventDefault(); window.location.hash = "#/wallet"; }}
                style={{ padding: "9px 18px", fontSize: 12, fontWeight: 700, borderRadius: 7, backgroundColor: C.green, color: C.bg, textDecoration: "none", fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                Ver billetera <ArrowRight size={13} />
              </a>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card title="Nuevo depósito" subtitle="Los fondos se acreditan de inmediato">
            {submitting ? (
              <div style={{ padding: 40 }}>
                <Spinner size={30} label="Conectando con Wompi..." />
              </div>
            ) : (
              <DepositForm onSubmit={handleSubmit} submitting={submitting} />
            )}
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 14 }}>
            {[
              { t: "Acreditación inmediata", d: "Depósitos PSE y tarjeta se reflejan al instante" },
              { t: "Tokenización PCI DSS", d: "Wompi tokeniza tu tarjeta; NEN nunca ve el PAN" },
              { t: "Límite diario", d: "Hasta USD 50.000 por día (configurable)" },
            ].map((x) => (
              <div key={x.t} style={{ padding: 12, borderRadius: 10, backgroundColor: C.bg2, border: "1px solid " + C.border }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t1 }}>{x.t}</div>
                <div style={{ fontSize: 9, color: C.t3, marginTop: 3 }}>{x.d}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
