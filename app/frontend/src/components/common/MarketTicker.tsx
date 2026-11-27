import { Activity } from "lucide-react";
import { useSpotQuotes } from "../../hooks/useMarketFeed";
import { MARKET_ASSETS, formatQuote, formatObservation, type MarketSnapshot, type Quotes } from "../../services/market";

export function MarketTicker({ snapshot }: { snapshot?: MarketSnapshot<Quotes> }) {
  return (
    <div aria-label="Cotizaciones de referencia" className="border-b border-white/10 bg-[#10151a] px-4 py-2 text-xs text-slate-300">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-300"><Activity size={13} aria-hidden="true" /> Kraken · USD</span>
        {snapshot?.data ? <>
          {MARKET_ASSETS.map((asset) => {
            const quote = snapshot.data[asset];
            return <span key={asset} className="whitespace-nowrap tabular-nums"><strong>{asset}</strong> {quote ? formatQuote(quote.price, asset) : "—"}</span>;
          })}
          <span className="text-slate-400">{snapshot.status === "stale" ? "Datos atrasados · " : ""}<time dateTime={snapshot.asOf}>{formatObservation(snapshot.asOf)}</time></span>
        </> : <span>{!snapshot ? "Consultando cotizaciones…" : snapshot.status === "offline" ? "Mercado desconectado" : "Cotizaciones no disponibles"}</span>}
      </div>
    </div>
  );
}

export default function PublicMarketTicker() {
  const { snapshot } = useSpotQuotes();
  return <MarketTicker snapshot={snapshot} />;
}
