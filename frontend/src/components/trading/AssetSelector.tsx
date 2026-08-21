/* Selector de activo — BANCA NEN */
import { useState } from "react";
import { Search, TrendingUp, TrendingDown } from "lucide-react";
import type { MarketCoin } from "../../services/coingecko";
import { C, FONT } from "../../theme";

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
    <div style={{ display: "flex", flexDirection: "column", fontFamily: FONT, height: "100%" }}>
      <div style={{ padding: 10, borderBottom: "1px solid " + C.border }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 9px", borderRadius: 6, backgroundColor: C.card, border: "1px solid " + C.border }}>
          <Search size={13} color={C.t3} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar activo..."
            style={{ background: "none", border: "none", outline: "none", color: C.t1, fontSize: 11, width: "100%", fontFamily: FONT }}
          />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading && filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: C.t3, fontSize: 11 }}>Cargando mercado...</div>
        )}
        {filtered.map((c) => {
          const active = c.id === selectedId;
          const up = c.price_change_percentage_24h >= 0;
          return (
            <div
              key={c.id}
              onClick={() => onSelect(c)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", cursor: "pointer",
                backgroundColor: active ? C.card : "transparent",
                borderLeft: "2px solid " + (active ? C.gold : "transparent"),
              }}
            >
              <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: c.color + "26", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: c.color, flexShrink: 0 }}>
                {c.symbol.slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.t1 }}>{c.symbol.toUpperCase()}</div>
                <div style={{ fontSize: 9, color: C.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.t1 }}>
                  ${c.current_price.toLocaleString(undefined, { maximumFractionDigits: c.current_price < 1 ? 4 : 2 })}
                </div>
                <div style={{ fontSize: 9, fontWeight: 600, color: up ? C.green : C.red, display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                  {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  {up ? "+" : ""}{c.price_change_percentage_24h?.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: C.t3, fontSize: 11 }}>Sin resultados</div>
        )}
      </div>
    </div>
  );
}
