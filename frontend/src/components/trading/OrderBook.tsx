/* ============================================================
   LIBRO DE ÓRDENES + ÚLTIMAS OPERACIONES — BANCA NEN
   Profundidad de mercado sintética derivada del precio en vivo
   (se actualiza con cada tick) + tape de operaciones recientes.
   ============================================================ */
import { useMemo } from "react";

interface Props {
  symbol: string;
  price: number; // precio en vivo
}

/* PRNG determinista por precio para que el libro se vea estable entre ticks */
function seeded(seed: number) {
  let s = Math.floor(seed);
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export default function OrderBook({ symbol, price }: Props) {
  const { bids, asks, trades, maxSize } = useMemo(() => {
    const rnd = seeded(price * 1000);
    const spread = Math.max(price * 0.0003, 1e-9);
    const bids = [] as { price: number; size: number }[];
    const asks = [] as { price: number; size: number }[];
    for (let i = 0; i < 9; i++) {
      const depth = 1 + i * (0.35 + rnd() * 0.3);
      bids.push({ price: price - spread * depth, size: 0.05 + rnd() * 4.2 });
      asks.push({ price: price + spread * depth, size: 0.05 + rnd() * 4.2 });
    }
    const trades = Array.from({ length: 14 }, (_, i) => ({
      id: i,
      side: rnd() > 0.5 ? ("buy" as const) : ("sell" as const),
      price: price * (1 + (rnd() - 0.5) * 0.001),
      size: 0.01 + rnd() * 1.8,
      ago: 2 + i * (3 + Math.floor(rnd() * 5)),
    }));
    const maxSize = Math.max(...bids.map((b) => b.size), ...asks.map((a) => a.size), 0.01);
    return { bids, asks, trades, maxSize };
  }, [price]);

  const fmtP = (n: number) => (n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n >= 1 ? n.toFixed(2) : n.toFixed(4));
  const fmtS = (n: number) => n.toFixed(2);

  return (
    <div className="flex flex-col gap-4 text-white">
      {/* Libro de órdenes */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">Libro de órdenes</span>
          <span className="text-[11px] text-gray-600 font-mono">profundidad demo</span>
        </div>
        {/* Asks (vendedores) */}
        <div className="flex flex-col-reverse">
          {asks.map((a, i) => (
            <div key={"a" + i} className="relative flex items-center gap-2 py-[3px] text-[12px] font-mono">
              <div className="absolute right-0 top-0 bottom-0 bg-red-500/10 rounded" style={{ width: `${(a.size / maxSize) * 100}%` }} />
              <span className="relative text-red-400/90 w-[72px]">{fmtP(a.price)}</span>
              <span className="relative text-gray-400">{fmtS(a.size)}</span>
            </div>
          ))}
        </div>
        {/* Precio actual */}
        <div className="flex items-center justify-between my-1 px-1 py-1 rounded-md bg-emerald-400/10 border border-emerald-400/20">
          <span className="text-[12px] font-bold text-emerald-400 font-mono">{fmtP(price)}</span>
          <span className="text-[11px] text-gray-400">{symbol.toUpperCase()}/USD</span>
        </div>
        {/* Bids (compradores) */}
        {bids.map((b, i) => (
          <div key={"b" + i} className="relative flex items-center gap-2 py-[3px] text-[12px] font-mono">
            <div className="absolute right-0 top-0 bottom-0 bg-emerald-400/10 rounded" style={{ width: `${(b.size / maxSize) * 100}%` }} />
            <span className="relative text-emerald-400/90 w-[72px]">{fmtP(b.price)}</span>
            <span className="relative text-gray-400">{fmtS(b.size)}</span>
          </div>
        ))}
      </div>

      {/* Últimas operaciones */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">Últimas operaciones</span>
        </div>
        <div className="flex flex-col">
          {trades.map((t) => (
            <div key={t.id} className="flex items-center gap-2 py-[3px] text-[12px] font-mono border-b border-white/[0.03]">
              <span className={`w-8 font-semibold ${t.side === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                {t.side === "buy" ? "BUY" : "SELL"}
              </span>
              <span className="text-gray-300">{fmtP(t.price)}</span>
              <span className="text-gray-500">{fmtS(t.size)}</span>
              <span className="ml-auto text-gray-600">{t.ago}s</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}