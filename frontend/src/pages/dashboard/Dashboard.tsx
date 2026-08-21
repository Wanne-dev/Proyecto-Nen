/* ============================================================
   DASHBOARD — BANCA NEN
   Contenido puro (la navegación la provee el sidebar único del
   layout). Datos reales del backend + CoinGecko vía proxy.
   ============================================================ */
import { useCallback, useEffect, useRef, useState, Component, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw, Search, AlertCircle, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, Wallet as WalletIcon, Sparkles,
} from "lucide-react";
import { getTopCryptos, getOHLC, getTimeframeDays, type MarketCoin, type OHLCPoint } from "../../services/coingecko";
import { calculateRSI, calculateMACD } from "../../services/indicators";
import { useWalletStore } from "../../store/wallet.slice";
import { useTradingStore } from "../../store/trading.slice";
import { useUIStore } from "../../store/ui.slice";
import { C, FONT, fmt, fmtCompact } from "../../theme";
import PriceChart from "../../components/charts/PriceChart";
import ScoreDisplay from "../../components/trading/ScoreDisplay";
import { iaService } from "../../services/ia";

/* ===== ERROR BOUNDARY ===== */
interface EBState { hasError: boolean; error: string }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, error: "" };
  static getDerivedStateFromError(e: Error) { return { hasError: true, error: e.message }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ backgroundColor: "#0A0A0F", minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "Inter, sans-serif", gap: 12, padding: 32 }}>
          <AlertCircle size={48} color="#FF3355" />
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Error en Dashboard</h2>
          <p style={{ fontSize: 12, color: "#A0A0B8", maxWidth: 400, textAlign: "center" }}>{this.state.error}</p>
          <button onClick={() => { this.setState({ hasError: false, error: "" }); window.location.reload(); }} style={{ padding: "8px 24px", fontSize: 13, fontWeight: 700, backgroundColor: "#F59E0B", color: "#0A0A0F", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type TF = "1M" | "5M" | "15M" | "1H" | "4H" | "1D" | "1W" | "1MO";
const TFS: TF[] = ["1M", "5M", "15M", "1H", "4H", "1D", "1W", "1MO"];
type OT = "market" | "limit" | "stop_limit";
const FEE = 0.001;

export default function Dashboard() {
  const nav = useNavigate();
  const toast = useUIStore((s) => s.toast);

  const wallet = useWalletStore((s) => s.wallet);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const placeOrder = useTradingStore((s) => s.placeOrder);
  const refreshOrders = useTradingStore((s) => s.refreshOrders);

  const [cryptos, setCryptos] = useState<MarketCoin[]>([]);
  const [coin, setCoin] = useState<MarketCoin | null>(null);
  const [ohlc, setOhlc] = useState<OHLCPoint[]>([]);
  const [tf, setTf] = useState<TF>("1D");
  const [loading, setLoading] = useState(true);
  const [marketError, setMarketError] = useState("");
  const [q, setQ] = useState("");
  const [aiScore, setAiScore] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  /* Trading panel state */
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [ot, setOt] = useState<OT>("market");
  const [amt, setAmt] = useState("");
  const [prc, setPrc] = useState("");
  const [stopP, setStopP] = useState("");

  /* RSI/MACD chart refs */
  const rsiEl = useRef<HTMLDivElement>(null);
  const macdEl = useRef<HTMLDivElement>(null);

  const balanceOf = (cur: string) => Number(wallet?.balances?.find((b) => b.currency === cur)?.balance || 0);
  const wUSD = balanceOf("USD");
  const wBTC = balanceOf("BTC");
  const wETH = balanceOf("ETH");
  const wUSDC = balanceOf("USDC");

  /* ----- Cargar criptomonedas (API real) ----- */
  const loadCryptos = useCallback(async () => {
    try {
      setLoading(true);
      setMarketError("");
      const d = await getTopCryptos(30);
      setCryptos(Array.isArray(d) ? d : []);
      setCoin((prev) => prev || (Array.isArray(d) && d[0]) || null);
    } catch (e: any) {
      setMarketError(e?.message || "Error cargando mercado");
      setCryptos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ----- Cargar velas OHLC ----- */
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

  /* RSI + MACD */
  useEffect(() => {
    const el = rsiEl.current;
    if (!el || ohlc.length < 16) return;
    try {
      import("lightweight-charts").then(({ createChart, ColorType, LineSeries }) => {
        if (!rsiEl.current) return;
        el.innerHTML = "";
        const ch = createChart(el, {
          layout: { background: { type: ColorType.Solid, color: C.bg }, textColor: C.t3, fontSize: 10 },
          grid: { vertLines: { color: "#1A1A2E" }, horzLines: { color: "#1A1A2E" } },
          rightPriceScale: { borderColor: C.border },
          timeScale: { visible: false },
          width: el.clientWidth, height: 80,
        });
        const s = ch.addSeries(LineSeries, { color: C.purple, lineWidth: 1, priceFormat: { type: "price", precision: 1, minMove: 0.1 } });
        const cl = ohlc.map((d) => d.close);
        const vals = calculateRSI(cl, 14);
        const off = cl.length - vals.length;
        s.setData(vals.map((v, i) => ({ time: ohlc[i + off].time as any, value: v })) as any);
      });
    } catch { /* ignore */ }
  }, [ohlc]);

  useEffect(() => {
    const el = macdEl.current;
    if (!el || ohlc.length < 27) return;
    try {
      import("lightweight-charts").then(({ createChart, ColorType, LineSeries, HistogramSeries }) => {
        if (!macdEl.current) return;
        el.innerHTML = "";
        const ch = createChart(el, {
          layout: { background: { type: ColorType.Solid, color: C.bg }, textColor: C.t3, fontSize: 10 },
          grid: { vertLines: { color: "#1A1A2E" }, horzLines: { color: "#1A1A2E" } },
          rightPriceScale: { borderColor: C.border },
          timeScale: { visible: false },
          width: el.clientWidth, height: 80,
        });
        const ml = ch.addSeries(LineSeries, { color: C.blue, lineWidth: 1 });
        const sl = ch.addSeries(LineSeries, { color: C.gold, lineWidth: 1 });
        const hl = ch.addSeries(HistogramSeries, { color: C.green + "60" });
        const cl = ohlc.map((d) => d.close);
        const r = calculateMACD(cl, 12, 26, 9);
        const off = cl.length - r.macd.length;
        ml.setData(r.macd.map((v, i) => ({ time: ohlc[i + off].time as any, value: v })) as any);
        sl.setData(r.signal.map((v, i) => ({ time: ohlc[i + off].time as any, value: v })) as any);
        hl.setData(r.histogram.map((v, i) => ({ time: ohlc[i + off].time as any, value: v, color: v >= 0 ? C.green + "60" : C.red + "60" })) as any);
      });
    } catch { /* ignore */ }
  }, [ohlc]);

  /* ----- Calculos de trading ----- */
  const curP = coin?.current_price || 0;
  const amtN = parseFloat(amt) || 0;
  const prcN = ot === "market" ? curP : (parseFloat(prc) || curP);
  const total = amtN * prcN;
  const fee = total * FEE;
  const net = side === "buy" ? total + fee : total - fee;
  const avail = side === "buy" ? wUSD : wBTC * prcN;
  const maxA = side === "buy" ? wUSD / prcN : wBTC;
  const inInsufficient = total > avail;

  /* ----- Ejecutar orden (API real) ----- */
  const exec = async () => {
    if (amtN <= 0 || !coin) return;
    setSubmitting(true);
    try {
      await placeOrder({
        type: ot === "stop_limit" ? "stop_loss" : ot,
        side,
        symbol: coin.symbol,
        quantity: amtN,
        price: prcN,
        stopPrice: ot === "stop_limit" ? (parseFloat(stopP) || 0) : undefined,
      });
      toast("success", "Orden ejecutada", `${side === "buy" ? "Compra" : "Venta"} de ${amtN} ${coin.symbol.toUpperCase()} a ${fmt(prcN)}`);
      refreshWallet();
      setAmt(""); setPrc(""); setStopP("");
    } catch (e: any) {
      toast("error", "Error en la orden", e?.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = cryptos.filter((c) =>
    c.name.toLowerCase().includes(q.toLowerCase()) || c.symbol.toLowerCase().includes(q.toLowerCase())
  );
  const chg = coin?.price_change_percentage_24h || 0;
  const up = chg >= 0;
  const sym = coin?.symbol.toUpperCase() || "";

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "6px 8px", fontSize: 11, borderRadius: 4,
    backgroundColor: C.card, border: "1px solid " + C.border, color: C.t1,
    outline: "none", fontFamily: FONT,
  };

  return (
    <ErrorBoundary>
      <div style={{ fontFamily: FONT }}>
        {marketError && (
          <div style={{ marginBottom: 14, padding: "9px 14px", borderRadius: 8, backgroundColor: C.gold + "12", border: "1px solid " + C.gold + "44", fontSize: 11, color: C.gold, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={13} />
            Mercado: {marketError}
            <button onClick={loadCryptos} style={{ marginLeft: "auto", padding: "3px 10px", fontSize: 10, backgroundColor: C.gold, color: C.bg, border: "none", borderRadius: 4, cursor: "pointer", fontFamily: FONT }}>Reintentar</button>
          </div>
        )}

        <div style={{ display: "flex", gap: 14, alignItems: "stretch", height: "calc(100vh - 130px)", minHeight: 540 }}>
          {/* Lista de activos */}
          <div style={{ width: 216, border: "1px solid " + C.border, borderRadius: 12, overflow: "hidden", backgroundColor: C.bg2, flexShrink: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: 8, borderBottom: "1px solid " + C.border }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 5, backgroundColor: C.card, border: "1px solid " + C.border }}>
                <Search size={13} color={C.t3} />
                <input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} style={{ background: "none", border: "none", outline: "none", color: C.t1, fontSize: 11, width: "100%", fontFamily: FONT }} />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filtered.map((c) => {
                const act = coin?.id === c.id;
                const isUp = (c.price_change_percentage_24h || 0) >= 0;
                return (
                  <div key={c.id} onClick={() => setCoin(c)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", cursor: "pointer", backgroundColor: act ? C.card : "transparent", borderLeft: act ? "2px solid " + C.gold : "2px solid transparent" }}>
                    {c.image ? (
                      <img src={c.image} alt="" style={{ width: 18, height: 18, borderRadius: "50%" }} />
                    ) : (
                      <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: C.gold + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: C.gold }}>{c.symbol.slice(0, 2)}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.symbol.toUpperCase()}</div>
                      <div style={{ fontSize: 9, color: C.t3 }}>${c.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </div>
                    <div style={{ fontSize: 9, color: isUp ? C.green : C.red, fontWeight: 600 }}>{isUp ? "+" : ""}{c.price_change_percentage_24h?.toFixed(2)}%</div>
                  </div>
                );
              })}
              {cryptos.length === 0 && !loading && (
                <div style={{ padding: 16, textAlign: "center", color: C.t3, fontSize: 11 }}>
                  Sin datos de mercado.<br />
                  <button onClick={loadCryptos} style={{ marginTop: 8, padding: "4px 12px", fontSize: 10, backgroundColor: C.card, color: C.gold, border: "1px solid " + C.border, borderRadius: 4, cursor: "pointer", fontFamily: FONT }}>Reintentar</button>
                </div>
              )}
            </div>
          </div>

          {/* Gráfico */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid " + C.border, borderRadius: 12, overflow: "hidden", backgroundColor: C.bg2, minWidth: 0 }}>
            {coin && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid " + C.border, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{sym} / USD</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 20 }}>{fmt(curP, curP < 1 ? 4 : 2)}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: up ? C.green : C.red, display: "flex", alignItems: "center", gap: 2 }}>
                      {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {up ? "+" : ""}{chg.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  {TFS.map((t) => (
                    <button key={t} onClick={() => setTf(t)} style={{ padding: "3px 7px", fontSize: 10, fontWeight: tf === t ? 700 : 400, border: "none", cursor: "pointer", borderRadius: 3, backgroundColor: tf === t ? C.gold : "transparent", color: tf === t ? C.bg : C.t2, fontFamily: FONT }}>{t}</button>
                  ))}
                </div>
              </div>
            )}

            {coin && (
              <div style={{ display: "flex", gap: 16, padding: "6px 14px", borderBottom: "1px solid " + C.border, backgroundColor: C.bg, fontSize: 10, flexWrap: "wrap" }}>
                <span><span style={{ color: C.t3 }}>24H High </span><strong style={{ color: C.t1 }}>{fmt(coin.high_24h || 0, 2)}</strong></span>
                <span><span style={{ color: C.t3 }}>24H Low </span><strong style={{ color: C.t1 }}>{fmt(coin.low_24h || 0, 2)}</strong></span>
                <span><span style={{ color: C.t3 }}>Vol </span><strong style={{ color: C.t1 }}>{fmtCompact(coin.total_volume || 0)}</strong></span>
                <span><span style={{ color: C.t3 }}>MCap </span><strong style={{ color: C.t1 }}>{fmtCompact(coin.market_cap || 0)}</strong></span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                  <Sparkles size={11} color={C.purple} /> Score IA: <strong style={{ color: aiScore >= 65 ? C.green : aiScore >= 45 ? C.gold : C.red }}>{aiScore}/100</strong>
                </span>
              </div>
            )}

            <div style={{ flex: 1, backgroundColor: C.bg, minHeight: 300, position: "relative" }}>
              <PriceChart data={ohlc} height="fill" showVolume />
              {loading && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: C.bg + "CC", zIndex: 5 }}>
                  <RefreshCw size={20} color={C.gold} />
                  <span style={{ marginLeft: 8, color: C.t2, fontSize: 11 }}>Cargando mercado...</span>
                </div>
              )}
            </div>

            {/* Indicadores */}
            <div style={{ height: 80, borderTop: "1px solid " + C.border, position: "relative", backgroundColor: C.bg }}>
              <span style={{ position: "absolute", top: 3, left: 7, fontSize: 8, color: C.purple, fontWeight: 600, zIndex: 2 }}>RSI (14)</span>
              <div ref={rsiEl} style={{ width: "100%", height: "100%" }} />
            </div>
            <div style={{ height: 80, borderTop: "1px solid " + C.border, position: "relative", backgroundColor: C.bg }}>
              <span style={{ position: "absolute", top: 3, left: 7, fontSize: 8, color: C.gold, fontWeight: 600, zIndex: 2 }}>MACD (12,26,9)</span>
              <div ref={macdEl} style={{ width: "100%", height: "100%" }} />
            </div>
          </div>

          {/* Panel de trading */}
          <div style={{ width: 286, border: "1px solid " + C.border, borderRadius: 12, overflowY: "auto", backgroundColor: C.bg2, flexShrink: 0, display: "flex", flexDirection: "column" }}>
            {/* Billetera */}
            <div style={{ padding: "10px 12px", borderBottom: "1px solid " + C.border }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <WalletIcon size={13} color={C.gold} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>Billetera</span>
                <div style={{ flex: 1 }} />
                <button onClick={() => nav("/wallet")} style={{ fontSize: 9, color: C.blue, background: "none", border: "none", cursor: "pointer", fontFamily: FONT }}>Ver todo →</button>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {[
                  { label: "USD", value: fmt(wUSD, 2), color: C.green },
                  { label: "BTC", value: wBTC.toFixed(6), color: C.gold },
                  { label: "ETH", value: wETH.toFixed(6), color: C.purple },
                  { label: "USDC", value: wUSDC.toFixed(2), color: C.blue },
                ].map((b) => (
                  <div key={b.label} style={{ flex: "1 1 45%", padding: "5px 7px", borderRadius: 5, backgroundColor: C.card }}>
                    <div style={{ fontSize: 8, color: C.t3 }}>{b.label}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: b.color }}>{b.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {coin && (
              <div style={{ padding: "8px 12px", borderBottom: "1px solid " + C.border }}>
                <ScoreDisplay score={aiScore} confidence={0.7 + aiScore / 1000} size="sm" />
              </div>
            )}

            {/* Buy/Sell */}
            <div style={{ display: "flex", borderBottom: "1px solid " + C.border }}>
              <button onClick={() => setSide("buy")} style={{ flex: 1, padding: "8px 0", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: FONT, backgroundColor: side === "buy" ? C.greenBg : "transparent", color: side === "buy" ? C.green : C.t3, borderBottom: side === "buy" ? "2px solid " + C.green : "2px solid transparent" }}>COMPRAR</button>
              <button onClick={() => setSide("sell")} style={{ flex: 1, padding: "8px 0", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: FONT, backgroundColor: side === "sell" ? C.redBg : "transparent", color: side === "sell" ? C.red : C.t3, borderBottom: side === "sell" ? "2px solid " + C.red : "2px solid transparent" }}>VENDER</button>
            </div>

            {/* Tipo de orden */}
            <div style={{ display: "flex", gap: 2, padding: "8px 12px" }}>
              {(["market", "limit", "stop_limit"] as OT[]).map((t) => (
                <button key={t} onClick={() => setOt(t)} style={{ flex: 1, padding: "4px 0", fontSize: 9, fontWeight: ot === t ? 700 : 400, border: "1px solid " + (ot === t ? C.border : "transparent"), cursor: "pointer", borderRadius: 4, fontFamily: FONT, backgroundColor: ot === t ? C.card : "transparent", color: ot === t ? C.t1 : C.t3 }}>
                  {t === "stop_limit" ? "Stop-Límite" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Formulario */}
            <div style={{ padding: "4px 12px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                <span style={{ color: C.t3 }}>Disponible</span>
                <span style={{ color: C.t2, fontWeight: 600 }}>{side === "buy" ? fmt(avail, 2) : wBTC.toFixed(6) + " " + sym}</span>
              </div>

              {ot !== "market" && (
                <div>
                  <label style={{ fontSize: 9, color: C.t3, display: "block", marginBottom: 2 }}>Precio (USD)</label>
                  <input value={prc} onChange={(e) => setPrc(e.target.value)} placeholder={String(curP)} style={inputStyle} />
                </div>
              )}
              {ot === "stop_limit" && (
                <div>
                  <label style={{ fontSize: 9, color: C.t3, display: "block", marginBottom: 2 }}>Precio stop</label>
                  <input value={stopP} onChange={(e) => setStopP(e.target.value)} placeholder="0.00" style={inputStyle} />
                </div>
              )}
              <div>
                <label style={{ fontSize: 9, color: C.t3, display: "block", marginBottom: 2 }}>Cantidad ({sym})</label>
                <input value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.00" style={inputStyle} />
              </div>

              <div style={{ display: "flex", gap: 3 }}>
                {[25, 50, 75, 100].map((p) => (
                  <button key={p} onClick={() => setAmt((maxA * p / 100).toFixed(6))} style={{ flex: 1, padding: "3px 0", fontSize: 9, border: "1px solid " + C.border, backgroundColor: C.card, color: C.t2, borderRadius: 4, cursor: "pointer", fontFamily: FONT }}>{p}%</button>
                ))}
              </div>

              {inInsufficient && amtN > 0 && (
                <div style={{ padding: "5px 8px", borderRadius: 4, backgroundColor: C.redBg, border: "1px solid " + C.red + "40", color: C.red, fontSize: 9 }}>
                  Saldo insuficiente. Disponible: {fmt(avail)}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, padding: "3px 0", borderTop: "1px solid " + C.border }}>
                <span style={{ color: C.t3 }}>Comisión (0.1%)</span>
                <span style={{ color: C.t2 }}>{fmt(fee)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, padding: "6px 8px", borderRadius: 5, backgroundColor: C.card }}>
                <span style={{ color: C.t2 }}>Total</span>
                <span style={{ color: side === "buy" ? C.green : C.red }}>{fmt(net)}</span>
              </div>

              <button
                onClick={exec}
                disabled={submitting || amtN <= 0 || inInsufficient}
                style={{ width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", borderRadius: 6, fontFamily: FONT, backgroundColor: side === "buy" ? C.green : C.red, color: side === "buy" ? C.bg : "#fff", opacity: submitting || amtN <= 0 || inInsufficient ? 0.6 : 1 }}
              >
                {submitting ? "Enviando..." : (side === "buy" ? "COMPRAR" : "VENDER") + " " + sym}
              </button>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontSize: 9, color: C.t3, marginTop: 4 }}>
                <TrendingUp size={10} color={C.green} /> Mercado en vivo · <TrendingDown size={10} color={C.red} /> precios reales
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
