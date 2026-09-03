/* Página de Trading — BANCA NEN (rediseño UI/UX, lógica intacta)
   - Fondo con imagen (assets/fondodasboard.png) + capa de legibilidad.
   - Paneles SIN marcos ni fondos grises.
   - El gráfico carga AL INSTANTE con velas demo mientras llega la API real.
   - Si la API falla (rate limit, red), se sigue mostrando demo SIN errores. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { getTopCryptos, getOHLC, getTimeframeDays, type MarketCoin, type OHLCPoint } from "../../services/coingecko";
import { generateSeedOHLC, FALLBACK_COINS, TFS, type TF } from "../../services/seedMarket";
import { useWalletStore } from "../../store/wallet.slice";
import { useTradingStore } from "../../store/trading.slice";
import { useUIStore } from "../../store/ui.slice";
import { fmt, fmtCompact } from "../../theme";
import PriceChart from "../../components/charts/PriceChart";
import AssetSelector from "../../components/trading/AssetSelector";
import OrderForm from "../../components/trading/OrderForm";
import OrderList from "../../components/trading/OrderList";
import ScoreDisplay from "../../components/trading/ScoreDisplay";
import OrderBook from "../../components/trading/OrderBook";
import NewsFeed from "../../components/trading/NewsFeed";
import { iaService } from "../../services/ia";
import { useLiveMarket } from "../../hooks/useLiveMarket";
import type { OrderType, OrderSide } from "../../types/Order.types";

export default function Trading() {
  const [coins, setCoins] = useState<MarketCoin[]>([]);
  const [coin, setCoin] = useState<MarketCoin | null>(null);
  const [ohlc, setOhlc] = useState<OHLCPoint[]>([]);
  const [tf, setTf] = useState<TF>("1D");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [aiScore, setAiScore] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  const wallet = useWalletStore((s) => s.wallet);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const { orders, refreshOrders, placeOrder, cancelOrder } = useTradingStore();
  const toast = useUIStore((s) => s.toast);

  /* Activo en pantalla: el real si ya cargó; si no, uno demo para que el
     gráfico y el libro de órdenes se vean AL INSTANTE sin esperar la API. */
  const displayCoin: MarketCoin = coin ?? FALLBACK_COINS[0];
  const visibleCoins = coins.length > 0 ? coins : FALLBACK_COINS;

  /* Datos del gráfico: velas reales si ya llegaron, semilla demo si no */
  const seed = useMemo(
    () => generateSeedOHLC(displayCoin.current_price, tf),
    [displayCoin.id, displayCoin.current_price, tf]
  );
  const base = ohlc.length > 0 ? ohlc : seed;
  const resetKey = displayCoin.id + ":" + tf + ":" + (ohlc.length > 0 ? "real" : "seed");
  const { points: liveOhlc, livePrice } = useLiveMarket(base, resetKey, {
    intervalMs: 1500,
    volatility: 0.0018,
  });

  const balanceOf = (cur: string) => Number(wallet?.balances?.find((b) => b.currency === cur)?.balance || 0);

  const loadCoins = useCallback(async () => {
    try {
      setLoading(true);
      const d = await getTopCryptos(24);
      setConnected(true);
      setCoins(Array.isArray(d) ? d : []);
      if (d.length > 0) {
        /* Conserva la selección del usuario y la refresca con datos reales */
        setCoin((prev) => {
          if (!prev) return d[0];
          const fresh = d.find((c) => c.id === prev.id);
          return fresh || prev;
        });
      }
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOHLC = useCallback(async () => {
    if (!coin) return;
    /* Reinicia a semilla para respuesta instantánea al cambiar activo/timeframe */
    setOhlc([]);
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
      iaService.getScore(coin.id).then((s) => { if (active) setAiScore(s); }).catch(() => {});
    }
    return () => { active = false; };
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

  const dispPrice = livePrice ?? displayCoin.current_price ?? 0;
  const chg = displayCoin.price_change_percentage_24h || 0;
  const up = chg >= 0;
  const tickUp = liveOhlc.length > 1
    ? liveOhlc[liveOhlc.length - 1].close >= liveOhlc[liveOhlc.length - 2].close
    : up;

  return (
    <div
      className="relative text-white overflow-hidden -m-5"
      style={{
        backgroundColor: "#08080d",
        backgroundImage:
          "radial-gradient(1000px 520px at 85% -10%, rgba(0,212,170,0.10), transparent 55%)," +
          "radial-gradient(900px 520px at 5% 110%, rgba(10,132,255,0.12), transparent 55%)," +
          "url('/assets/fondodasboard.png')",
        backgroundSize: "auto, auto, cover",
        backgroundPosition: "center, center, center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Capa mínima: solo suaviza, deja ver el fondo */}
      <div className="absolute inset-0 bg-[#08080d]/30" />

      <div className="relative z-10 flex flex-col xl:flex-row xl:h-[calc(100vh-54px)]">
        {/* ===== Watchlist + Libro de órdenes ===== */}
        <aside className="shrink-0 xl:w-[236px] flex flex-col xl:h-full">
          <div className="flex-1 min-h-0">
            <AssetSelector coins={visibleCoins} selectedId={displayCoin.id} onSelect={setCoin} loading={loading} />
          </div>
          <div className="shrink-0 max-h-[340px] xl:max-h-[46%] overflow-y-auto px-3 py-2">
            <OrderBook symbol={displayCoin.symbol} price={dispPrice} />
          </div>
        </aside>

        {/* ===== Gráfico ===== */}
        <main className="flex-1 min-w-0 flex flex-col xl:h-full">
          <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-1 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[14px] font-extrabold" style={{ backgroundColor: (displayCoin.color || "#0a84ff") + "26", color: displayCoin.color || "#0a84ff" }}>
                {displayCoin.symbol.slice(0, 2)}
              </div>
              <div>
                <div className="text-[16px] font-bold tracking-tight leading-tight">{displayCoin.symbol.toUpperCase()} / USD</div>
                <div className="text-[11px] text-gray-500">{displayCoin.name} · #{displayCoin.market_cap_rank}</div>
              </div>
              <div className="ml-2">
                <div
                  className="text-[22px] font-extrabold tracking-tight leading-tight transition-colors"
                  style={{ color: tickUp ? "#00d4aa" : "#ff4d5e" }}
                >
                  {fmt(dispPrice, dispPrice < 1 ? 4 : 2)}
                </div>
                <div className="text-[13px] font-bold flex items-center gap-1" style={{ color: up ? "#00d4aa" : "#ff4d5e" }}>
                  {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {up ? "+" : ""}{Math.abs(chg).toFixed(2)}%
                  <span className="text-gray-600 font-normal">(24h)</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                EN VIVO
              </span>
              {!connected && (
                <span className="text-[11px] text-gray-600">· datos de demostración</span>
              )}
              <button onClick={loadOHLC} title="Actualizar gráfico" className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {/* Stats de mercado */}
          <div className="flex gap-4 px-4 py-2 text-[12px] text-gray-500 flex-wrap">
            <span>Alto 24h <strong className="text-gray-200">{fmt(displayCoin.high_24h || 0, 2)}</strong></span>
            <span>Bajo 24h <strong className="text-gray-200">{fmt(displayCoin.low_24h || 0, 2)}</strong></span>
            <span>Volumen <strong className="text-gray-200">{fmtCompact(displayCoin.total_volume || 0)}</strong></span>
            <span>Cap. mercado <strong className="text-gray-200">{fmtCompact(displayCoin.market_cap || 0)}</strong></span>
            <span>Cambio 7d <strong style={{ color: (displayCoin.price_change_percentage_7d_in_currency || 0) >= 0 ? "#00d4aa" : "#ff4d5e" }}>{fmt(displayCoin.price_change_percentage_7d_in_currency || 0, 2)}%</strong></span>
            {connected && coins.length > 0 && (
              <span className="ml-auto flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Mercado conectado
              </span>
            )}
          </div>

          {/* Timeframes */}
          <div className="flex items-center gap-1 px-4 pb-2">
            {TFS.map((t) => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className={`px-2.5 py-1 rounded-lg text-[13px] font-semibold transition-colors ${
                  tf === t ? "bg-[#00d4aa]/15 text-[#00d4aa]" : "text-gray-500 hover:text-gray-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Chart en vivo */}
          <div className="flex-1 min-h-[320px] px-2 pb-2">
            <PriceChart data={liveOhlc} height="fill" showVolume live defaultIndicators={["sma"]} />
          </div>
        </main>

        {/* ===== Panel de trading ===== */}
        <aside className="shrink-0 xl:w-[320px] flex flex-col xl:h-full xl:overflow-y-auto">
          <div className="px-4 pt-4 pb-1">
            <ScoreDisplay score={aiScore} confidence={0.71 + aiScore / 1000} size="sm" />
          </div>
          {coin ? (
            <OrderForm
              coin={coin}
              buyAvailable={balanceOf("USD")}
              sellAvailable={balanceOf(coin.symbol)}
              aiScore={aiScore}
              onSubmit={handleOrder}
              submitting={submitting}
            />
          ) : (
            <div className="px-4 py-10 text-center text-gray-500 text-[13px]">
              <div className="animate-pulse">Conectando con el mercado…</div>
            </div>
          )}
          {/* Noticias debajo del área de compra/venta */}
          <div className="px-4 py-3">
            <NewsFeed />
          </div>
          {/* Órdenes */}
          <div className="px-4 py-3">
            <OrderList orders={orders} onCancel={(id) => cancelOrder(id).then(() => toast("info", "Orden cancelada"))} />
          </div>
        </aside>
      </div>
    </div>
  );
}