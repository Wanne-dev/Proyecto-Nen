/* Formulario de órdenes — BANCA NEN (diseño moderno, lógica intacta) */
import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import type { MarketCoin } from "../../services/coingecko";
import type { OrderType, OrderSide } from "../../types/Order.types";
import { fmt } from "../../theme";

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  market: "Mercado",
  limit: "Límite",
  stop_loss: "Stop-Loss",
  take_profit: "Take-Profit",
  stop_limit: "Stop-Límite",
  trailing_stop: "Trailing",
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

const inputCls =
  "w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-[#00d4aa] transition-colors";

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
    <div className="flex flex-col gap-4 p-4 text-white">
      {/* Buy / Sell */}
      <div className="flex gap-2">
        {(["buy", "sell"] as OrderSide[]).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={`flex-1 py-2.5 rounded-xl text-[15px] font-bold transition-all ${
              side === s
                ? s === "buy"
                  ? "bg-[#00d4aa] text-black shadow-[0_0_24px_rgba(0,212,170,0.35)]"
                  : "bg-[#ff4d5e] text-white shadow-[0_0_24px_rgba(255,77,94,0.35)]"
                : "bg-white/5 text-gray-400 border border-white/10 hover:text-gray-200"
            }`}
          >
            {s === "buy" ? "COMPRAR" : "VENDER"}
          </button>
        ))}
      </div>

      {/* Tipo de orden */}
      <div>
        <label className="block text-[12px] text-gray-500 font-semibold mb-1.5">Tipo de orden</label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(ORDER_TYPE_LABELS) as OrderType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors ${
                type === t ? "bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/40" : "bg-white/5 text-gray-400 border border-white/10 hover:text-gray-200"
              }`}
            >
              {ORDER_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Monto */}
      <div>
        <label className="block text-[12px] text-gray-500 font-semibold mb-1.5">
          Cantidad <span className="text-gray-600">({coin.symbol.toUpperCase()})</span>
        </label>
        <input
          type="number" min="0" step="any" value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={side === "buy" ? "Cantidad a comprar" : "Cantidad a vender"}
          className={inputCls}
        />
        <div className="flex gap-1.5 mt-1.5">
          {[0.25, 0.5, 0.75, 1].map((p) => (
            <button key={p} onClick={() => pct(p)} className="flex-1 py-1 text-[12px] bg-white/5 border border-white/10 text-gray-400 rounded-lg hover:text-gray-200 transition-colors">
              {p * 100}%
            </button>
          ))}
        </div>
      </div>

      {/* Precio */}
      {type !== "market" && (
        <div>
          <label className="block text-[12px] text-gray-500 font-semibold mb-1.5">Precio límite (USD)</label>
          <input type="number" min="0" step="any" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={String(coin.current_price)} className={inputCls} />
        </div>
      )}

      {/* Stop */}
      {showStop && (
        <div>
          <label className="block text-[12px] text-gray-500 font-semibold mb-1.5">Precio stop (USD)</label>
          <input type="number" min="0" step="any" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} placeholder="Activar en..." className={inputCls} />
        </div>
      )}

      {/* Resumen */}
      {amtN > 0 && (
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-1.5 text-[13px]">
          <Row label="Precio de referencia" value={fmt(priceN, priceN < 1 ? 4 : 2)} />
          <Row label="Total" value={fmt(total)} strong />
          <Row label="Comisión (0.1%)" value={fmt(fee)} dim />
          <Row label={side === "buy" ? "Total a pagar" : "Total a recibir"} value={fmt(net)} color={side === "buy" ? "#00d4aa" : "#ff4d5e"} strong />
        </div>
      )}

      {inInsufficient && (
        <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-[13px]">
          Saldo insuficiente. Disponible: {fmt(available)}
        </div>
      )}

      {/* Score IA */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#0a84ff]/[0.08] border border-[#0a84ff]/20">
        <Sparkles size={14} color="#0a84ff" />
        <div className="flex-1">
          <div className="text-[11px] text-gray-500">Score de acierto IA</div>
          <div className="text-[14px] font-bold" style={{ color: aiScore >= 65 ? "#00d4aa" : aiScore >= 45 ? "#f5a623" : "#ff4d5e" }}>
            {aiScore}/100
          </div>
        </div>
        <div className="text-[11px] text-gray-500 text-right">
          {aiScore >= 65 ? "Operación favorable" : aiScore >= 45 ? "Riesgo moderado" : "Alta probabilidad de pérdida"}
        </div>
      </div>

      <button
        onClick={submit}
        disabled={submitting || amtN <= 0 || inInsufficient}
        className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[15px] font-bold transition-all ${
          side === "buy" ? "bg-[#00d4aa] text-black" : "bg-[#ff4d5e] text-white"
        } disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110`}
      >
        <Send size={14} />
        {submitting ? "Enviando..." : (side === "buy" ? "Comprar" : "Vender") + " " + coin.symbol.toUpperCase()}
      </button>
    </div>
  );
}

function Row({ label, value, strong, dim, color }: { label: string; value: string; strong?: boolean; dim?: boolean; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className={dim ? "text-gray-600" : "text-gray-400"}>{label}</span>
      <span className={strong ? "font-bold" : ""} style={{ color: color || "#fff" }}>{value}</span>
    </div>
  );
}