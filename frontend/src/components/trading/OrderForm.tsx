/* Formulario de órdenes — BANCA NEN */
import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import type { MarketCoin } from "../../services/coingecko";
import type { OrderType, OrderSide } from "../../types/Order.types";
import { C, FONT, fmt } from "../../theme";

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  market: "Mercado",
  limit: "Límite",
  stop_loss: "Stop-Loss",
  take_profit: "Take-Profit",
  stop_limit: "Stop-Límite",
  trailing_stop: "Trailing Stop",
  oco: "OCO",
};

const FEE = 0.001;

interface Props {
  coin: MarketCoin;
  buyAvailable: number;   // USD disponibles
  sellAvailable: number;  // unidades del activo
  aiScore: number;        // score IA 0-100
  onSubmit: (params: { type: OrderType; side: OrderSide; quantity: number; price?: number; stopPrice?: number; total: number }) => void;
  submitting?: boolean;
}

export default function OrderForm({ coin, buyAvailable, sellAvailable, aiScore, onSubmit, submitting }: Props) {
  const [side, setSide] = useState<OrderSide>("buy");
  const [type, setType] = useState<OrderType>("market");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");

  const priceN = type === "market" ? coin.current_price : (parseFloat(price) || coin.current_price);
  const amtN = parseFloat(amount) || 0;
  const total = amtN * priceN;
  const fee = total * FEE;
  const net = side === "buy" ? total + fee : total - fee;
  const available = side === "buy" ? buyAvailable : sellAvailable * priceN;
  const maxAmount = side === "buy" ? buyAvailable / priceN : sellAvailable;

  const pct = (p: number) => setAmount(String((maxAmount * p).toFixed(coin.current_price < 1 ? 6 : 4)));

  const submit = () => {
    if (amtN <= 0) return;
    onSubmit({
      type,
      side,
      quantity: amtN,
      price: type === "market" ? undefined : priceN,
      stopPrice: ["stop_loss", "stop_limit", "trailing_stop", "oco"].includes(type) ? (parseFloat(stopPrice) || 0) : undefined,
      total,
    });
  };

  const inInsufficient = total > available && side === "buy";
  const showStop = ["stop_loss", "stop_limit", "trailing_stop", "oco"].includes(type);

  return (
    <div style={{ fontFamily: FONT, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Buy / Sell */}
      <div style={{ display: "flex", gap: 6 }}>
        {(["buy", "sell"] as OrderSide[]).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 6, fontSize: 12, fontWeight: 700,
              backgroundColor: side === s ? (s === "buy" ? C.green : C.red) : C.card,
              color: side === s ? (s === "buy" ? "#0A0A0F" : "#fff") : C.t2,
              border: "1px solid " + (side === s ? "transparent" : C.border), cursor: "pointer", fontFamily: FONT,
            }}
          >
            {s === "buy" ? "COMPRAR" : "VENDER"} {coin.symbol.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Tipo de orden */}
      <div>
        <label style={{ fontSize: 10, color: C.t3, fontWeight: 600, display: "block", marginBottom: 5 }}>Tipo de orden</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {(Object.keys(ORDER_TYPE_LABELS) as OrderType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              style={{
                padding: "3px 8px", fontSize: 9, borderRadius: 4, fontFamily: FONT, cursor: "pointer",
                backgroundColor: type === t ? C.blue : C.card,
                color: type === t ? "#fff" : C.t2,
                border: "1px solid " + (type === t ? C.blue : C.border),
              }}
            >
              {ORDER_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Monto */}
      <div>
        <label style={{ fontSize: 10, color: C.t3, fontWeight: 600, display: "block", marginBottom: 5 }}>Cantidad</label>
        <input
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={side === "buy" ? "Cantidad en " + coin.symbol.toUpperCase() : "Cantidad a vender"}
          style={inputSt}
        />
        <div style={{ display: "flex", gap: 4, marginTop: 5 }}>
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <button key={p} onClick={() => pct(p)} style={{ flex: 1, padding: "3px 0", fontSize: 9, backgroundColor: C.card, border: "1px solid " + C.border, color: C.t2, borderRadius: 4, cursor: "pointer", fontFamily: FONT }}>
              {p * 100}%
            </button>
          ))}
        </div>
      </div>

      {/* Precio */}
      {type !== "market" && (
        <div>
          <label style={{ fontSize: 10, color: C.t3, fontWeight: 600, display: "block", marginBottom: 5 }}>
            Precio límite (USD)
          </label>
          <input type="number" min="0" step="any" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={String(coin.current_price)} style={inputSt} />
        </div>
      )}

      {/* Stop */}
      {showStop && (
        <div>
          <label style={{ fontSize: 10, color: C.t3, fontWeight: 600, display: "block", marginBottom: 5 }}>Precio stop (USD)</label>
          <input type="number" min="0" step="any" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} placeholder="Activar en..." style={inputSt} />
        </div>
      )}

      {/* Resumen */}
      {amtN > 0 && (
        <div style={{ padding: 10, borderRadius: 8, backgroundColor: C.card, display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
          <Row label="Precio de referencia" value={fmt(priceN, priceN < 1 ? 4 : 2)} />
          <Row label="Total" value={fmt(total)} strong />
          <Row label="Comisión (0.1%)" value={fmt(fee)} dim />
          <Row label={side === "buy" ? "Total a pagar" : "Total a recibir"} value={fmt(net)} color={side === "buy" ? C.green : C.red} strong />
        </div>
      )}

      {inInsufficient && (
        <div style={{ padding: "7px 10px", borderRadius: 6, backgroundColor: C.redBg, border: "1px solid " + C.red + "40", color: C.red, fontSize: 10 }}>
          Saldo insuficiente. Disponible: {fmt(available)}
        </div>
      )}

      {/* Score IA */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, backgroundColor: C.purple + "12", border: "1px solid " + C.purple + "33" }}>
        <Sparkles size={14} color={C.purple} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: C.t3 }}>Score de acierto IA</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: aiScore >= 65 ? C.green : aiScore >= 45 ? C.gold : C.red }}>{aiScore}/100</div>
        </div>
        <div style={{ fontSize: 9, color: C.t3, textAlign: "right" }}>
          {aiScore >= 65 ? "Operación favorable" : aiScore >= 45 ? "Riesgo moderado" : "Alta probabilidad de pérdida"}
        </div>
      </div>

      <button
        onClick={submit}
        disabled={submitting || amtN <= 0 || inInsufficient}
        style={{
          padding: "10px 0", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: "pointer",
          backgroundColor: side === "buy" ? C.green : C.red,
          color: side === "buy" ? "#0A0A0F" : "#fff",
          border: "none", fontFamily: FONT, opacity: submitting || amtN <= 0 || inInsufficient ? 0.6 : 1,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        }}
      >
        <Send size={14} />
        {submitting ? "Enviando..." : (side === "buy" ? "Comprar" : "Vender") + " " + coin.symbol.toUpperCase()}
      </button>
    </div>
  );
}

function Row({ label, value, strong, dim, color }: { label: string; value: string; strong?: boolean; dim?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: dim ? C.t3 : C.t2, fontSize: 10 }}>{label}</span>
      <span style={{ fontWeight: strong ? 700 : 500, color: color || C.t1, fontSize: strong ? 12 : 11 }}>{value}</span>
    </div>
  );
}

const inputSt: React.CSSProperties = {
  width: "100%", padding: "7px 10px", fontSize: 12, borderRadius: 6,
  backgroundColor: C.card, border: "1px solid " + C.border, color: C.t1,
  outline: "none", fontFamily: FONT,
};
