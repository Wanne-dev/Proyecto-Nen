/* Página de Trading — BANCA NEN */
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Activity, Timer } from "lucide-react";
import { getTopCryptos, getOHLC, getTimeframeDays, type MarketCoin, type OHLCPoint } from "../../services/coingecko";
import { useWalletStore } from "../../store/wallet.slice";
import { useTradingStore } from "../../store/trading.slice";
import { useUIStore } from "../../store/ui.slice";
import { C, FONT, fmt, fmtCompact } from "../../theme";
import PriceChart from "../../components/charts/PriceChart";
import AssetSelector from "../../components/trading/AssetSelector";
import OrderForm from "../../components/trading/OrderForm";
import OrderList from "../../components/trading/OrderList";
import ScoreDisplay from "../../components/trading/ScoreDisplay";
import { iaService } from "../../services/ia";
import type { OrderType, OrderSide } from "../../types/Order.types";

type TF = "1M" | "5M" | "15M" | "1H" | "4H" | "1D" | "1W" | "1MO";
const TFS: TF[] = ["1M", "5M", "15M", "1H", "4H", "1D", "1W", "1MO"];

export default function Trading() {
  const [coins, setCoins] = useState<MarketCoin[]>([]);
  const [coin, setCoin] = useState<MarketCoin | null>(null);
  const [ohlc, setOhlc] = useState<OHLCPoint[]>([]);
  const [tf, setTf] = useState<TF>("1D");
  const [loading, setLoading] = useState(true);
  const [marketError, setMarketError] = useState("");
  const [aiScore, setAiScore] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const wallet = useWalletStore((s) => s.wallet);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const { orders, refreshOrders, placeOrder, cancelOrder } = useTradingStore();
  const toast = useUIStore((s) => s.toast);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const balanceOf = (cur: string) => Number(wallet?.balances?.find((b) => b.currency === cur)?.balance || 0);

  const loadCoins = useCallback(async () => {
    try {
      setLoading(true);
      setMarketError("");
      const d = await getTopCryptos(24);
      setCoins(Array.isArray(d) ? d : []);
      if (d.length > 0) setCoin((prev) => prev || d[0]);
    } catch (e: any) {
      setMarketError(e.message || "Error de mercado");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOHLC = useCallback(async () => {
    if (!coin) return;
    try {
      const d = await getOHLC(coin.id, getTimeframeDays(tf));
      setOhlc(Array.isArray(d) ? d : []);
    } catch {
      setOhlc([]);
    }
  }, [coin, tf]);

  useEffect(() => {
    loadCoins();
    refreshOrders();
    refreshWallet();
  }, [loadCoins, refreshOrders, refreshWallet]);

  useEffect(() => {
    loadOHLC();
  }, [loadOHLC]);

  /* Score IA del activo seleccionado */
  useEffect(() => {
    let active = true;
    if (coin) {
      iaService.getScore(coin.id).then((s) => { if (active) setAiScore(s); });
    }
    return () => { active = false; };
  }, [coin]);

  /* Ticks en vivo simulados */
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setLastRefresh(new Date());
      setOhlc((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const move = (Math.random() - 0.5) * last.close * 0.004;
        const close = Math.max(last.close * 0.9, last.close + move);
        return [...prev.slice(0, -1), { ...last, close, high: Math.max(last.high, close), low: Math.min(last.low, close), time: Math.floor(Date.now() / 1000) }];
      });
      setCoins((prev) => prev.map((c) => (c.id === coin?.id ? { ...c, current_price: c.current_price * (1 + (Math.random() - 0.5) * 0.002) } : c)));
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [coin]);

  const handleOrder = async (params: { type: OrderType; side: OrderSide; quantity: number; price?: number; stopPrice?: number; total: number }) => {
    if (!coin) return;
    setSubmitting(true);
    try {
      await placeOrder({
        type: params.type,
        side: params.side,
        symbol: coin.symbol,
        quantity: params.quantity,
        price: params.price || coin.current_price,
        stopPrice: params.stopPrice,
      });
      toast("success", "Orden ejecutada", `${params.side === "buy" ? "Compra" : "Venta"} de ${params.quantity} ${coin.symbol.toUpperCase()} a ${fmt(params.price || coin.current_price)}`);
      refreshWallet();
    } catch (e: any) {
      toast("error", "Error en la orden", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const up = (coin?.price_change_percentage_24h || 0) >= 0;
  const marketStatus = coins.length > 0 && !marketError;

  return (
    <div style={{ fontFamily: FONT }}>
      {marketError && (
        <div style={{ marginBottom: 14, padding: "9px 14px", borderRadius: 8, backgroundColor: C.gold + "12", border: "1px solid " + C.gold + "44", fontSize: 11, color: C.gold, display: "flex", alignItems: "center", gap: 8 }}>
          <Activity size={13} />
          {marketError} — Mostrando datos de demostración.
          <button onClick={loadCoins} style={{ marginLeft: "auto", padding: "3px 10px", fontSize: 10, backgroundColor: C.gold, color: C.bg, border: "none", borderRadius: 4, cursor: "pointer", fontFamily: FONT }}>Reintentar</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 14, alignItems: "stretch", height: "calc(100vh - 130px)", minHeight: 560 }}>
        {/* Lista de activos */}
        <div style={{ width: 220, border: "1px solid " + C.border, borderRadius: 12, overflow: "hidden", backgroundColor: C.bg2, flexShrink: 0 }}>
          <AssetSelector coins={coins} selectedId={coin?.id || null} onSelect={setCoin} loading={loading} />
        </div>

        {/* Gráfico */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid " + C.border, borderRadius: 12, overflow: "hidden", backgroundColor: C.bg2, minWidth: 0 }}>
          {/* Cabecera par */}
          {coin && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid " + C.border, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: coin.color + "26", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: coin.color }}>
                  {coin.symbol.slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{coin.symbol.toUpperCase()} / USD</div>
                  <div style={{ fontSize: 9, color: C.t3 }}>{coin.name} · #{coin.market_cap_rank}</div>
                </div>
                <div style={{ marginLeft: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, letterSpacing: -0.5 }}>
                    {fmt(coin.current_price, coin.current_price < 1 ? 4 : 2)}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: up ? C.green : C.red, display: "flex", alignItems: "center", gap: 4 }}>
                    {up ? "▲" : "▼"} {Math.abs(coin.price_change_percentage_24h || 0).toFixed(2)}% <span style={{ color: C.t3, fontWeight: 400 }}>(24h)</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: 9, color: C.t3, display: "flex", alignItems: "center", gap: 4 }}>
                  <Timer size={11} color={C.green} /> Live · actualizado {lastRefresh.toLocaleTimeString("es-CO")}
                </div>
                <button onClick={loadOHLC} title="Actualizar gráfico" style={{ background: "none", border: "none", cursor: "pointer", color: C.t2, display: "flex", padding: 4 }}>
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Market info */}
          {coin && (
            <div style={{ display: "flex", gap: 20, padding: "7px 14px", borderBottom: "1px solid " + C.border, backgroundColor: C.bg, fontSize: 10, flexWrap: "wrap" }}>
              <span><span style={{ color: C.t3 }}>Alto 24h </span><strong style={{ color: C.t1 }}>{fmt(coin.high_24h || 0, 2)}</strong></span>
              <span><span style={{ color: C.t3 }}>Bajo 24h </span><strong style={{ color: C.t1 }}>{fmt(coin.low_24h || 0, 2)}</strong></span>
              <span><span style={{ color: C.t3 }}>Volumen </span><strong style={{ color: C.t1 }}>{fmtCompact(coin.total_volume || 0)}</strong></span>
              <span><span style={{ color: C.t3 }}>Cap. mercado </span><strong style={{ color: C.t1 }}>{fmtCompact(coin.market_cap || 0)}</strong></span>
              <span><span style={{ color: C.t3 }}>Cambio 7d </span><strong style={{ color: (coin.price_change_percentage_7d_in_currency || 0) >= 0 ? C.green : C.red }}>{fmt((coin.price_change_percentage_7d_in_currency || 0), 2)}%</strong></span>
            </div>
          )}

          {/* Timeframes */}
          <div style={{ display: "flex", gap: 3, padding: "6px 14px", borderBottom: "1px solid " + C.border, backgroundColor: C.bg2, alignItems: "center" }}>
            <span style={{ fontSize: 9, color: C.t3, marginRight: 6 }}>Timeframe</span>
            {TFS.map((t) => (
              <button key={t} onClick={() => setTf(t)} style={{ padding: "3px 8px", fontSize: 10, fontWeight: tf === t ? 700 : 400, border: "none", cursor: "pointer", borderRadius: 4, backgroundColor: tf === t ? C.gold : "transparent", color: tf === t ? C.bg : C.t2, fontFamily: FONT }}>
                {t}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            {marketStatus && <span style={{ fontSize: 9, color: C.green, display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: C.green }} /> Mercado conectado</span>}
          </div>

          {/* Chart */}
          <div style={{ flex: 1, backgroundColor: C.bg, minHeight: 300 }}>
            <PriceChart data={ohlc} height="fill" showVolume />
          </div>
          <style>{`@media(max-width:900px){.price-chart-wrap{height:300px!important}}`}</style>
        </div>

        {/* Panel de trading */}
        <div style={{ width: 300, border: "1px solid " + C.border, borderRadius: 12, overflowY: "auto", backgroundColor: C.bg2, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          {coin && (
            <div style={{ padding: "10px 14px", borderBottom: "1px solid " + C.border }}>
              <ScoreDisplay score={aiScore} confidence={0.71 + (aiScore / 1000)} />
            </div>
          )}
          {coin && (
            <div style={{ borderTop: "1px solid " + C.border, flex: 1 }}>
              <OrderForm
                coin={coin}
                buyAvailable={balanceOf("USD")}
                sellAvailable={balanceOf(coin.symbol)}
                aiScore={aiScore}
                onSubmit={handleOrder}
                submitting={submitting}
              />
            </div>
          )}
        </div>
      </div>

      {/* Órdenes */}
      <div style={{ marginTop: 14, border: "1px solid " + C.border, borderRadius: 12, backgroundColor: C.bg2, padding: 14 }}>
        <OrderList orders={orders} onCancel={(id) => cancelOrder(id).then(() => toast("info", "Orden cancelada"))} />
      </div>
    </div>
  );
}
