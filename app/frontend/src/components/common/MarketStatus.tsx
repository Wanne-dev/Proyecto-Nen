import { Clock3, Radio } from "lucide-react";
import { formatObservation, type MarketSnapshot } from "../../services/market";

export function marketMessage(snapshot?: MarketSnapshot<unknown>) {
  if (!snapshot) return "Consultando Kraken…";
  return snapshot.status === "offline" ? "Mercado desconectado" : "Datos de mercado no disponibles";
}

export default function MarketStatus({ snapshot }: { snapshot?: MarketSnapshot<unknown> }) {
  if (!snapshot?.asOf) return <span className="text-slate-400">{marketMessage(snapshot)}</span>;
  const stale = snapshot.status === "stale";
  const Icon = stale ? Clock3 : Radio;
  return <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-slate-400">
    <Icon size={13} aria-hidden="true" className={stale ? "text-amber-300" : "text-emerald-300"} />
    <span>{snapshot.source} · {stale ? "Datos atrasados" : "Consulta"}</span> <time dateTime={snapshot.asOf}>{formatObservation(snapshot.asOf)}</time>
  </span>;
}
