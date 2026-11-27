import { useState } from "react";
import { Send } from "lucide-react";
import { formatQuote, formatUsd, type MarketAsset } from "../../services/market";
import type { OrderSide } from "../../types/Order.types";
import { CURRENCY_DECIMALS } from "../../constants/currencies";

type Props = {
  symbol: MarketAsset;
  indicativePrice: number | null;
  buyAvailable: number;
  sellAvailable: number;
  onSubmit: (params: { side: OrderSide; quantity: number }) => Promise<void>;
  submitting?: boolean;
};

export default function OrderForm({ symbol, indicativePrice, buyAvailable, sellAvailable, onSubmit, submitting }: Props) {
  const [side, setSide] = useState<OrderSide>("buy");
  const [amount, setAmount] = useState("");
  const quantity = Number(amount);
  const precision = CURRENCY_DECIMALS[symbol] ?? 8;
  const step = 10 ** -precision;
  const total = Math.round((quantity * (indicativePrice ?? 0) + Number.EPSILON) * 100) / 100;
  const fee = Math.round((total * 0.001 + Number.EPSILON) * 100) / 100;
  const net = side === "buy" ? total + fee : total - fee;
  const insufficient = side === "buy" ? Math.round(net * 100) > Math.round(buyAvailable * 100) : quantity > sellAvailable;

  return (
    <form className="flex flex-col gap-4 text-white" onSubmit={(event) => {
      event.preventDefault();
      if (indicativePrice !== null && quantity > 0 && !submitting) void onSubmit({ side, quantity });
    }}>
      <div className="flex gap-2">
        {(["buy", "sell"] as const).map((option) => (
          <button key={option} type="button" disabled={submitting} aria-pressed={side === option} onClick={() => setSide(option)}
            className={`flex-1 py-2.5 px-1 rounded-xl text-sm font-bold ${side === option ? "bg-emerald-400 text-black" : "bg-white/5 text-gray-300 border border-white/10"}`}>
            {option === "buy" ? "Comprar" : "Vender"}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-300">Orden de mercado con saldo virtual. No se envía a Kraken.</p>
      <label className="grid gap-2 text-sm text-gray-300" htmlFor="trade-sim-quantity">
        Cantidad ({symbol})
        <input id="trade-sim-quantity" required disabled={submitting} type="number" min={step} max="100000000" step={step}
          className="min-w-0 w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white"
          value={amount} onChange={(event) => setAmount(event.target.value)}
          placeholder={side === "buy" ? "Cantidad a comprar" : "Cantidad a vender"} />
      </label>
      <div className="grid gap-1 rounded-lg border border-white/10 p-3 text-sm text-gray-300">
        <span>Disponible: {side === "buy" ? `${formatUsd(buyAvailable)} USD` : `${sellAvailable} ${symbol}`}</span>
        <span>Precio de referencia: {indicativePrice === null ? "—" : `${formatQuote(indicativePrice, symbol)} USD`}</span>
        {indicativePrice !== null && quantity > 0 && <>
          <span>Comisión estimada (0,1%): {formatUsd(fee)} USD</span>
          <strong>{side === "buy" ? "A descontar" : "A recibir"}: {formatUsd(net)} USD aprox.</strong>
        </>}
      </div>
      {indicativePrice !== null && insufficient && <p role="status" className="text-sm text-red-400">La estimación supera el saldo disponible; la API valida la operación.</p>}
      <p className="text-xs text-gray-400">{indicativePrice === null ? "Necesitas una cotización vigente para operar." : "El servidor confirma el precio al registrar la orden."}</p>
      <button type="submit" disabled={submitting || indicativePrice === null || quantity <= 0}
        className="flex items-center justify-center gap-2 py-3 px-2 rounded-xl font-bold bg-emerald-400 text-black disabled:opacity-50">
        <Send size={14} /> {submitting ? "Registrando…" : `${side === "buy" ? "Comprar" : "Vender"} ${symbol}`}
      </button>
    </form>
  );
}
