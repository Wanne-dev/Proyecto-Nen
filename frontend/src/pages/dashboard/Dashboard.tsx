/* ============================================================
   DASHBOARD — BANCA NEN (rediseño UI/UX, lógica intacta)
   Mismo estilo que Trading (fondo, sin marcos, carga instantánea
   con datos de demostración si la API falla). Nunca se queda vacío.
   ============================================================ */
import { useCallback, useEffect, useMemo, useState, Component, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw, AlertCircle, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Wallet as WalletIcon, Sparkles,
} from "lucide-react";
import { getTopCryptos, getOHLC, getTimeframeDays, type MarketCoin, type OHLCPoint } from "../../services/coingecko";
import { generateSeedOHLC, FALLBACK_COINS, TFS, type TF } from "../../services/seedMarket";
import { useWalletStore } from "../../store/wallet.slice";
import { useTradingStore } from "../../store/trading.slice";
import { useUIStore } from "../../store/ui.slice";
import { fmt, fmtCompact } from "../../theme";
import PriceChart from "../../components/charts/PriceChart";
import AssetSelector from "../../components/trading/AssetSelector";
import OrderForm from "../../components/trading/OrderForm";
import ScoreDisplay from "../../components/trading/ScoreDisplay";
import { iaService } from "../../services/ia";
import { useLiveMarket } from "../../hooks/useLiveMarket";
import type { OrderType, OrderSide } from "../../types/Order.types";

/* ===== ERROR BOUNDARY ===== */
interface EBState { hasError: boolean; error: string }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, error: "" };
  static getDerivedStateFromError(e: Error) { return { hasError: true, error: e.message }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ backgroundColor: "#08080d", minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "Inter, sans-serif", gap: 12, padding: 32 }}>
          <AlertCircle size={48} color="#ff4d5e" />
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Error en Dashboard</h2>
          <p style={{ fontSize: 14, color: "#a0a0b8", maxWidth: 400, textAlign: "center" }}>{this.state.error}</p>
          <button onClick={() => { this.setState({ hasError: false, error: "" }); window.location.reload(); }} style={{ padding: "8px 24px", fontSize: 15, fontWeight: 700, backgroundColor: "#f5a623", color: "#08080d", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Dashboard() {
  const nav = useNavigate();
  const toast = useUIStore((s) => s.toast);

  const wallet = useWalletStore((s) => s.wallet);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const { placeOrder, refreshOrders } = useTradingStore();

  const [coins, setCoins] = useState<MarketCoin[]>([]);
  const [coin, setCoin] = useState<MarketCoin | null>(null);
  const [ohlc, setOhlc] = useState<OHLCPoint[]>([]);
  const [tf, setTf] = useState<TF>("1D");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [aiScore, setAiScore] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  /* Activo en pantalla: real si ya cargó; si no, demo instantáneo */
  const displayCoin: MarketCoin = coin ?? FALLBACK_COINS[0];
  const visibleCoins = coins.length > 0 ? coins : FALLBACK_COINS;

  /* Datos del gráfico: reales si llegaron, semilla demo si no */
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
  const wUSD = balanceOf("USD");
  const wBTC = balanceOf("BTC");
  const wETH = balanceOf("ETH");
  const wUSDC = balanceOf("USDC");

  const loadCryptos = useCallback(async () => {
    try {
      setLoading(true);
      const d = await getTopCryptos(30);
      setConnected(true);
      setCoins(Array.isArray(d) ? d : []);
      if (d.length > 0) {
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
    setOhlc([]);
    try {
      const d = await getOHLC(coin.id, getTimeframeDays(tf));
      setOhlc(Array.isArray(d) ? d : []);
    } catch {
      setOhlc([]);
    }
  }, [coin, tf]);

  useEffect(() => {
    loadCryptos();
    refreshWallet();
    refreshOrders();
  }, [loadCryptos, refreshWallet, refreshOrders]);

  useEffect(() => { loadOHLC(); }, [loadOHLC]);

  /* Score IA del activo */
  useEffect(() => {
    let active = true;
    if (coin) iaService.getScore(coin.id).then((s) => { if (active) setAiScore(s); }).catch(() => {});
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
  const sym = displayCoin.symbol.toUpperCase();
  const tickUp = liveOhlc.length > 1
    ? liveOhlc[liveOhlc.length - 1].close >= liveOhlc[liveOhlc.length - 2].close
    : up;

  return (
    <ErrorBoundary>
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
        <div className="absolute inset-0 bg-[#08080d]/30" />

        <div className="relative z-10 flex flex-col xl:flex-row xl:h-[calc(100vh-54px)]">
          {/* ===== Watchlist ===== */}
          <aside className="shrink-0 xl:w-[236px] flex flex-col xl:h-full">
            <AssetSelector coins={visibleCoins} selectedId={displayCoin.id} onSelect={setCoin} loading={loading} />
          </aside>

          {/* ===== Gráfico ===== */}
          <main className="flex-1 min-w-0 flex flex-col xl:h-full">
            <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-1 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[14px] font-extrabold" style={{ backgroundColor: (displayCoin.color || "#0a84ff") + "26", color: displayCoin.color || "#0a84ff" }}>
                  {sym.slice(0, 2)}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[20px] font-extrabold tracking-tight">{fmt(dispPrice, dispPrice < 1 ? 4 : 2)}</span>
                  <span className="text-[14px] font-bold flex items-center gap-1" style={{ color: up ? "#00d4aa" : "#ff4d5e" }}>
                    {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {up ? "+" : ""}{chg.toFixed(2)}%
                  </span>
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
                {TFS.map((t) => (
                  <button key={t} onClick={() => setTf(t)} className={`px-2 py-1 rounded-lg text-[12px] font-semibold transition-colors ${tf === t ? "bg-[#00d4aa]/15 text-[#00d4aa]" : "text-gray-500 hover:text-gray-200"}`}>{t}</button>
                ))}
              </div>
            </div>

            {/* Stats de mercado */}
            <div className="flex gap-4 px-4 py-2 text-[12px] text-gray-500 flex-wrap">
              <span>24H Alto <strong className="text-gray-200">{fmt(displayCoin.high_24h || 0, 2)}</strong></span>
              <span>24H Bajo <strong className="text-gray-200">{fmt(displayCoin.low_24h || 0, 2)}</strong></span>
              <span>Volumen <strong className="text-gray-200">{fmtCompact(displayCoin.total_volume || 0)}</strong></span>
              <span>Cap. mercado <strong className="text-gray-200">{fmtCompact(displayCoin.market_cap || 0)}</strong></span>
              <span className="ml-auto flex items-center gap-1.5">
                <Sparkles size={11} color="#a78bfa" /> Score IA: <strong style={{ color: aiScore >= 65 ? "#00d4aa" : aiScore >= 45 ? "#f5a623" : "#ff4d5e" }}>{aiScore}/100</strong>
              </span>
            </div>

            {/* Chart en vivo */}
            <div className="flex-1 min-h-[320px] px-2 pb-2">
              <PriceChart data={liveOhlc} height="fill" showVolume live defaultIndicators={["sma"]} />
            </div>
          </main>

          {/* ===== Panel de trading ===== */}
          <aside className="shrink-0 xl:w-[320px] flex flex-col xl:h-full xl:overflow-y-auto">
            {/* Billetera */}
            <div className="px-4 pt-4">
              <div className="flex items-center gap-1.5 mb-2">
                <WalletIcon size={13} className="text-[#f5a623]" />
                <span className="text-[13px] font-bold">Billetera</span>
                <div className="flex-1" />
                <button onClick={() => nav("/wallet")} className="text-[11px] text-[#0a84ff]">Ver todo →</button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "USD", value: fmt(wUSD, 2), color: "#00d4aa" },
                  { label: "BTC", value: wBTC.toFixed(6), color: "#f5a623" },
                  { label: "ETH", value: wETH.toFixed(6), color: "#a78bfa" },
                  { label: "USDC", value: wUSDC.toFixed(2), color: "#0a84ff" },
                ].map((b) => (
                  <div key={b.label} className="px-1 py-1.5">
                    <div className="text-[10px] text-gray-600">{b.label}</div>
                    <div className="text-[14px] font-bold" style={{ color: b.color }}>{b.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 pt-3 pb-1">
              <ScoreDisplay score={aiScore} confidence={0.7 + aiScore / 1000} size="sm" />
            </div>

            {coin ? (
              <OrderForm
                coin={coin}
                buyAvailable={wUSD}
                sellAvailable={wBTC}
                aiScore={aiScore}
                onSubmit={handleOrder}
                submitting={submitting}
              />
            ) : (
              <div className="px-4 py-10 text-center text-gray-500 text-[13px]">
                <div className="animate-pulse">Conectando con el mercado…</div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </ErrorBoundary>
  );
}