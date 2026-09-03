/* Selector de activo — BANCA NEN (diseño moderno, lógica intacta) */
import { useState } from "react";
import { Search } from "lucide-react";
import type { MarketCoin } from "../../services/coingecko";

interface Props {
  coins: MarketCoin[];
  selectedId: string | null;
  onSelect: (coin: MarketCoin) => void;
  loading?: boolean;
}

export default function AssetSelector({ coins, selectedId, onSelect, loading }: Props) {
  const [q, setQ] = useState("");
  const filtered = coins.filter((c) =>
    c.name.toLowerCase().includes(q.toLowerCase()) || c.symbol.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full text-white">
      <div className="p-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 focus-within:border-[#00d4aa]/50 transition-colors">
          <Search size={13} className="text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar activo..."
            className="bg-transparent border-none outline-none text-[14px] text-white placeholder-gray-600 w-full"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-1.5 pb-2">
        {loading && filtered.length === 0 && (
          <div className="p-6 text-center text-gray-600 text-[13px]">Cargando mercado...</div>
        )}
        {filtered.map((c) => {
          const active = c.id === selectedId;
          const up = c.price_change_percentage_24h >= 0;
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition-colors ${
                active ? "bg-[#00d4aa]/[0.08]" : "hover:bg-white/[0.03]"
              }`}
              style={active ? { boxShadow: "inset 0 0 0 1px rgba(0,212,170,0.25)" } : undefined}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0" style={{ backgroundColor: (c.color || "#0a84ff") + "26", color: c.color || "#0a84ff" }}>
                {c.symbol.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-gray-100">{c.symbol.toUpperCase()}</div>
                <div className="text-[11px] text-gray-600 truncate">{c.name}</div>
              </div>
              <div className="text-right">
                <div className="text-[14px] font-semibold text-gray-200">
                  ${c.current_price.toLocaleString(undefined, { maximumFractionDigits: c.current_price < 1 ? 4 : 2 })}
                </div>
                <div className="text-[11px] font-semibold" style={{ color: up ? "#00d4aa" : "#ff4d5e" }}>
                  {up ? "+" : ""}{c.price_change_percentage_24h?.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div className="p-6 text-center text-gray-600 text-[13px]">Sin resultados</div>
        )}
      </div>
    </div>
  );
}