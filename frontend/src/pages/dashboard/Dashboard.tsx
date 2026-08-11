import { useState, useEffect, useCallback, useRef, Component, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Wallet, ArrowUpRight, ArrowDownRight, RefreshCw, Search,
  BarChart3, Shield, Bell, Settings, LayoutDashboard, TrendingUp, User,
  AlertCircle, LogOut
} from "lucide-react";
import {
  getTopCryptos, getOHLC, getTimeframeDays,
  type MarketCoin, type OHLCPoint
} from "@/services/coingecko";
import { calculateRSI, calculateMACD } from "@/services/indicators";
import { getWallet, depositFunds, withdrawFunds, type WalletData } from "@/services/wallet";
import { useAuthStore } from "@/store/auth.slice";
import {
  createChart, type IChartApi, ColorType,
  CandlestickSeries, HistogramSeries, LineSeries
} from "lightweight-charts";

/* ===== ERROR BOUNDARY - Evita pantalla blanca ===== */
interface EBState { hasError: boolean; error: string }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, error: "" };
  static getDerivedStateFromError(e: Error) {
    return { hasError: true, error: e.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ backgroundColor: "#0A0A0F", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "Inter, sans-serif", gap: 12, padding: 32 }}>
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

/* ===== PALETA DE COLORES BANCA NEN ===== */
const C = {
  bg: "#0A0A0F", bg2: "#0E0E18", card: "#1A1A2E", border: "#2A2A4A",
  green: "#00FFAA", greenBg: "#00FFAA15", red: "#FF3355", redBg: "#FF335515",
  gold: "#F59E0B", blue: "#3B82F6", purple: "#8B5CF6",
  t1: "#FFFFFF", t2: "#A0A0B8", t3: "#6B6B80",
};

type OT = "market" | "limit" | "stop-limit";
type TS = "buy" | "sell";
type TF = "1M" | "5M" | "15M" | "1H" | "4H" | "1D" | "1W" | "1MO";
const TFS: TF[] = ["1M", "5M", "15M", "1H", "4H", "1D", "1W", "1MO"];
const FEE = 0.001;

function fmt(n: number, d: number) {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
}

/* ===== Helper: remover chart de forma segura ===== */
function safeRemove(chart: IChartApi | null) {
  if (!chart) return;
  try {
    chart.remove();
  } catch {
    /* "Object is disposed" — ya fue removido, ignorar */
  }
}

export default function Dashboard() {
  const { user, token } = useAuthStore();
  const loc = useLocation();
  const nav = useNavigate();

  /* Estado principal */
  const [cryptos, setCryptos] = useState<MarketCoin[]>([]);
  const [coin, setCoin] = useState<MarketCoin | null>(null);
  const [ohlc, setOhlc] = useState<OHLCPoint[]>([]);
  const [tf, setTf] = useState<TF>("1D");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(true);
  const [ot, setOt] = useState<OT>("market");
  const [side, setSide] = useState<TS>("buy");
  const [amt, setAmt] = useState("");
  const [prc, setPrc] = useState("");
  const [stopP, setStopP] = useState("");
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [marketError, setMarketError] = useState("");
  const [walletError, setWalletError] = useState("");

  /* Refs para charts - cada uno en su propio ref para controlar ciclo de vida */
  const chartEl = useRef<HTMLDivElement>(null);
  const rsiEl = useRef<HTMLDivElement>(null);
  const macdEl = useRef<HTMLDivElement>(null);
  const mainChartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);

  /* ----- Cargar criptomonedas ----- */
  const loadCryptos = useCallback(async () => {
    try {
      setLoading(true);
      setMarketError("");
      const d = await getTopCryptos(30);
      if (Array.isArray(d)) {
        setCryptos(d);
        if (!coin && d.length > 0) setCoin(d[0]);
      } else {
        setCryptos([]);
        setMarketError("La API devolvio un formato inesperado");
      }
    } catch (e: any) {
      console.error("Market error:", e);
      setCryptos([]);
      setMarketError(e.message || "Error cargando mercado");
    } finally {
      setLoading(false);
    }
  }, [coin]);

  /* ----- Cargar velas OHLC ----- */
  const loadOHLC = useCallback(async () => {
    if (!coin) return;
    try {
      const d = await getOHLC(coin.id, getTimeframeDays(tf));
      if (Array.isArray(d)) {
        setOhlc(d);
      } else {
        setOhlc([]);
      }
    } catch (e: any) {
      console.error("OHLC error:", e);
      setOhlc([]);
    }
  }, [coin, tf]);

  /* ----- Cargar billetera ----- */
  const loadWallet = useCallback(async () => {
    if (!token) {
      setWalletError("Sesion expirada. Inicia sesion de nuevo.");
      return;
    }
    try {
      setWalletError("");
      const w = await getWallet(token);
      setWalletData(w);
    } catch (e: any) {
      console.error("Wallet error:", e);
      if (e.message && e.message.includes("401")) {
        setWalletError("Sesion expirada (401). Tu token JWT caduco. Inicia sesion de nuevo.");
      } else {
        setWalletError(e.message || "Error cargando billetera");
      }
    }
  }, [token]);

  /* ----- Efectos de carga ----- */
  useEffect(() => { loadCryptos(); }, [loadCryptos]);
  useEffect(() => { loadOHLC(); }, [loadOHLC]);
  useEffect(() => { loadWallet(); }, [loadWallet]);
  useEffect(() => {
    const iv = setInterval(loadCryptos, 30000);
    return () => clearInterval(iv);
  }, [loadCryptos]);

  /* ===== CHART DE VELAS - Ciclo de vida seguro ===== */
  useEffect(() => {
    const el = chartEl.current;
    if (!el || ohlc.length === 0) return;

    /* Remover chart anterior de forma segura */
    safeRemove(mainChartRef.current);
    mainChartRef.current = null;

    const ch = createChart(el, {
      layout: { background: { type: ColorType.Solid, color: C.bg }, textColor: C.t3, fontSize: 11 },
      grid: { vertLines: { color: "#1A1A2E" }, horzLines: { color: "#1A1A2E" } },
      crosshair: {
        vertLine: { color: C.gold, width: 1 as 1, style: 2 as 2 },
        horLine: { color: C.gold, width: 1 as 1, style: 2 as 2 },
      },
      rightPriceScale: { borderColor: C.border, scaleMargins: { top: 0.1, bottom: 0.25 } },
      timeScale: { borderColor: C.border, timeVisible: true, secondsVisible: false },
      width: el.clientWidth, height: el.clientHeight,
    });

    const cs = ch.addSeries(CandlestickSeries, {
      upColor: C.green, downColor: C.red, borderUpColor: C.green,
      borderDownColor: C.red, wickUpColor: C.green, wickDownColor: C.red,
    });
    const vs = ch.addSeries(HistogramSeries, {
      color: C.blue + "40", priceFormat: { type: "volume" }, priceScaleId: "vol",
    });
    ch.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    cs.setData(ohlc.map(d => ({ time: d.time as number, open: d.open, high: d.high, low: d.low, close: d.close })) as any);
    vs.setData(ohlc.map((d, i) => ({
      time: d.time as number,
      value: (d.high - d.low) * 1e6 + (i > 0 ? Math.abs(d.close - ohlc[i - 1].close) * 5e6 : 0),
      color: d.close >= d.open ? C.green + "30" : C.red + "30",
    })) as any);

    mainChartRef.current = ch;

    const onR = () => {
      try { ch.applyOptions({ width: el.clientWidth, height: el.clientHeight }); } catch {}
    };
    window.addEventListener("resize", onR);

    return () => {
      window.removeEventListener("resize", onR);
      safeRemove(ch);
      mainChartRef.current = null;
    };
  }, [ohlc]);

  /* ===== RSI ===== */
  useEffect(() => {
    const el = rsiEl.current;
    if (!el || ohlc.length < 16 || !showRSI) return;

    safeRemove(rsiChartRef.current);
    rsiChartRef.current = null;

    const old = el.querySelector("canvas");
    if (old) old.remove();

    const ch = createChart(el, {
      layout: { background: { type: ColorType.Solid, color: C.bg }, textColor: C.t3, fontSize: 10 },
      grid: { vertLines: { color: "#1A1A2E" }, horzLines: { color: "#1A1A2E" } },
      rightPriceScale: { borderColor: C.border },
      timeScale: { visible: false },
      width: el.clientWidth, height: 80,
    });
    const s = ch.addSeries(LineSeries, {
      color: C.purple, lineWidth: 1 as 1,
      priceFormat: { type: "price", precision: 1, minMove: 0.1 },
    });
    const cl = ohlc.map(d => d.close);
    const vals = calculateRSI(cl, 14);
    const off = cl.length - vals.length;
    s.setData(vals.map((v, i) => ({ time: ohlc[i + off].time as number, value: v })) as any);

    rsiChartRef.current = ch;
    const onR = () => { try { ch.applyOptions({ width: el.clientWidth }); } catch {} };
    window.addEventListener("resize", onR);
    return () => {
      window.removeEventListener("resize", onR);
      safeRemove(ch);
      rsiChartRef.current = null;
    };
  }, [ohlc, showRSI]);

  /* ===== MACD ===== */
  useEffect(() => {
    const el = macdEl.current;
    if (!el || ohlc.length < 27 || !showMACD) return;

    safeRemove(macdChartRef.current);
    macdChartRef.current = null;

    const ch = createChart(el, {
      layout: { background: { type: ColorType.Solid, color: C.bg }, textColor: C.t3, fontSize: 10 },
      grid: { vertLines: { color: "#1A1A2E" }, horzLines: { color: "#1A1A2E" } },
      rightPriceScale: { borderColor: C.border },
      timeScale: { visible: false },
      width: el.clientWidth, height: 80,
    });
    const ml = ch.addSeries(LineSeries, { color: C.blue, lineWidth: 1 as 1 });
    const sl = ch.addSeries(LineSeries, { color: C.gold, lineWidth: 1 as 1 });
    const hl = ch.addSeries(HistogramSeries, { color: C.green + "60" });
    const cl = ohlc.map(d => d.close);
    const r = calculateMACD(cl, 12, 26, 9);
    const off = cl.length - r.macd.length;
    ml.setData(r.macd.map((v, i) => ({ time: ohlc[i + off].time as number, value: v })) as any);
    sl.setData(r.signal.map((v, i) => ({ time: ohlc[i + off].time as number, value: v })) as any);
    hl.setData(r.histogram.map((v, i) => ({
      time: ohlc[i + off].time as number, value: v,
      color: v >= 0 ? C.green + "60" : C.red + "60",
    })) as any);

    macdChartRef.current = ch;
    const onR = () => { try { ch.applyOptions({ width: el.clientWidth }); } catch {} };
    window.addEventListener("resize", onR);
    return () => {
      window.removeEventListener("resize", onR);
      safeRemove(ch);
      macdChartRef.current = null;
    };
  }, [ohlc, showMACD]);

  /* ===== LIMPIAR charts al desmontar ===== */
  useEffect(() => {
    return () => {
      safeRemove(mainChartRef.current);
      safeRemove(rsiChartRef.current);
      safeRemove(macdChartRef.current);
    };
  }, []);

  /* ===== VALORES DE BILLETERA ===== */
  const wUSD = Number(walletData?.balances?.find(b => b.currency === "USD")?.balance || 0);
  const wBTC = Number(walletData?.balances?.find(b => b.currency === "BTC")?.balance || 0);
  const wETH = Number(walletData?.balances?.find(b => b.currency === "ETH")?.balance || 0);
  const wUSDC = Number(walletData?.balances?.find(b => b.currency === "USDC")?.balance || 0);

  /* ===== CALCULOS DE TRADING ===== */
  const curP = coin?.current_price || 0;
  const amtN = parseFloat(amt) || 0;
  const prcN = ot === "market" ? curP : (parseFloat(prc) || curP);
  const total = amtN * prcN;
  const fee = total * FEE;
  const net = side === "buy" ? total + fee : total - fee;
  const avail = side === "buy" ? wUSD : wBTC;
  const maxA = side === "buy" ? wUSD / prcN : wBTC;

  /* ===== EJECUTAR ORDEN ===== */
  const exec = async () => {
    if (amtN <= 0 || prcN <= 0 || !token) {
      alert("No hay token. Inicia sesion de nuevo.");
      return;
    }
    try {
      if (side === "buy") {
        await depositFunds(token, "USD", amtN * prcN, "Compra " + (coin?.symbol.toUpperCase() || ""));
      } else {
        await withdrawFunds(token, "USD", amtN * prcN, "Venta " + (coin?.symbol.toUpperCase() || ""));
      }
      const w = await getWallet(token);
      setWalletData(w);
      alert((side === "buy" ? "Compra" : "Venta") + " ejecutada!");
    } catch (e: any) {
      if (e.message && e.message.includes("401")) {
        alert("Sesion expirada. Inicia sesion de nuevo.");
      } else {
        alert(e.message || "Error en la operacion");
      }
    }
    setAmt("");
    setPrc("");
    setStopP("");
  };

  /* ===== LISTA FILTRADA ===== */
  const safeCryptos = Array.isArray(cryptos) ? cryptos : [];
  const filtered = safeCryptos.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.symbol.toLowerCase().includes(q.toLowerCase())
  );
  const chg = coin?.price_change_percentage_24h || 0;
  const up = chg >= 0;
  const sym = coin?.symbol.toUpperCase() || "";

  const inputStyle = {
    width: "100%", padding: "5px 7px", fontSize: 11, borderRadius: 4,
    backgroundColor: C.card, border: "1px solid " + C.border, color: C.t1,
    outline: "none", fontFamily: "Inter, sans-serif" as const,
  };

  const logout = () => {
    useAuthStore.getState().logout();
    nav("/login");
  };

  return (
    <ErrorBoundary>
      <div style={{ backgroundColor: C.bg, minHeight: "100vh", color: C.t1, fontFamily: "Inter, sans-serif", display: "flex" }}>

        {/* ===== BANNER 401 ===== */}
        {walletError && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, backgroundColor: C.red + "20", borderBottom: "1px solid " + C.red, padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={16} color={C.red} />
              <span style={{ fontSize: 12, color: C.red }}>{walletError}</span>
            </div>
            <button onClick={logout} style={{ padding: "4px 12px", fontSize: 11, fontWeight: 700, backgroundColor: C.red, color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
              <LogOut size={12} /> Iniciar Sesion
            </button>
          </div>
        )}

        {/* ===== BANNER MERCADO ===== */}
        {marketError && (
          <div style={{ position: "fixed", top: walletError ? 40 : 0, left: 0, right: 0, zIndex: 9998, backgroundColor: C.gold + "15", borderBottom: "1px solid " + C.gold, padding: "6px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={14} color={C.gold} />
            <span style={{ fontSize: 11, color: C.gold }}>Mercado: {marketError}</span>
            <button onClick={loadCryptos} style={{ marginLeft: 8, padding: "2px 8px", fontSize: 10, backgroundColor: C.gold, color: C.bg, border: "none", borderRadius: 3, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Reintentar</button>
          </div>
        )}

        {/* ===== LEFT NAV ===== */}
        <div style={{ width: 64, backgroundColor: C.bg2, borderRight: "1px solid " + C.border, display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", gap: 4 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.gold + "20", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Shield size={20} color={C.gold} />
          </div>
          {[
            { to: "/dashboard", Icon: LayoutDashboard },
            { to: "/wallet", Icon: Wallet },
            { to: "/markets", Icon: TrendingUp },
            { to: "/settings", Icon: User },
          ].map(({ to, Icon }) => (
            <Link key={to} to={to} style={{ width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: loc.pathname === to ? C.gold + "15" : "transparent", textDecoration: "none" }}>
              <Icon size={18} color={loc.pathname === to ? C.gold : C.t3} />
            </Link>
          ))}
          <div style={{ flex: 1 }} />
          <Link to="/settings" style={{ width: 40, height: 40, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
            <Settings size={16} color={C.t3} />
          </Link>
        </div>

        {/* ===== MAIN ===== */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* ===== TOP BAR ===== */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid " + C.border, backgroundColor: C.bg2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: C.gold }}>NEN</span>
              <span style={{ fontSize: 12, color: C.t2 }}>BANK</span>
              <span style={{ fontSize: 11, color: C.t3, margin: "0 4px" }}>|</span>
              <div style={{ display: "flex", gap: 2 }}>
                {[
                  { to: "/dashboard", label: "Dashboard" },
                  { to: "/wallet", label: "Wallet" },
                  { to: "/markets", label: "Markets" },
                  { to: "/settings", label: "Settings" },
                ].map(item => (
                  <Link key={item.to} to={item.to} style={{ fontSize: 11, color: loc.pathname === item.to ? C.gold : C.t3, textDecoration: "none", fontWeight: loc.pathname === item.to ? 700 : 400, padding: "3px 10px", borderRadius: 4, backgroundColor: loc.pathname === item.to ? C.gold + "15" : "transparent", display: "flex", alignItems: "center", gap: 5 }}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Bell size={15} color={C.t3} style={{ cursor: "pointer" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, backgroundColor: C.card }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                  {user?.firstName?.[0] || "U"}
                </div>
                <span style={{ fontSize: 11 }}>{user?.firstName || "User"}</span>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

            {/* ===== CRYPTO LIST ===== */}
            <div style={{ width: 210, borderRight: "1px solid " + C.border, backgroundColor: C.bg2, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: 8, borderBottom: "1px solid " + C.border }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 5, backgroundColor: C.card, border: "1px solid " + C.border }}>
                  <Search size={13} color={C.t3} />
                  <input placeholder="Buscar..." value={q} onChange={e => setQ(e.target.value)} style={{ background: "none", border: "none", outline: "none", color: C.t1, fontSize: 11, width: "100%", fontFamily: "Inter, sans-serif" }} />
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {filtered.map(c => {
                  const act = coin?.id === c.id;
                  const isUp = c.price_change_percentage_24h >= 0;
                  return (
                    <div key={c.id} onClick={() => setCoin(c)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", cursor: "pointer", backgroundColor: act ? C.card : "transparent", borderLeft: act ? "2px solid " + C.gold : "2px solid transparent" }}>
                      <img src={c.image} alt="" style={{ width: 18, height: 18, borderRadius: "50%" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.symbol.toUpperCase()}</div>
                        <div style={{ fontSize: 9, color: C.t3 }}>${c.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                      </div>
                      <div style={{ fontSize: 9, color: isUp ? C.green : C.red, fontWeight: 600 }}>{isUp ? "+" : ""}{c.price_change_percentage_24h?.toFixed(2)}%</div>
                    </div>
                  );
                })}
                {safeCryptos.length === 0 && !loading && (
                  <div style={{ padding: 16, textAlign: "center", color: C.t3, fontSize: 11 }}>
                    Sin datos de mercado.
                    <br />
                    <button onClick={loadCryptos} style={{ marginTop: 8, padding: "4px 12px", fontSize: 10, backgroundColor: C.card, color: C.gold, border: "1px solid " + C.border, borderRadius: 4, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>Reintentar</button>
                  </div>
                )}
              </div>
            </div>

            {/* ===== CHART + TRADING ===== */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

              {/* PAIR HEADER */}
              {coin && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid " + C.border }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <img src={coin.image} alt="" style={{ width: 24, height: 24, borderRadius: "50%" }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{sym} / USD</div>
                        <div style={{ fontSize: 10, color: C.t3 }}>{coin.name}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 20 }}>{fmt(curP, 2)}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: up ? C.green : C.red, display: "flex", alignItems: "center", gap: 2 }}>
                        {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {up ? "+" : ""}{chg.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 2 }}>
                    {TFS.map(t => (
                      <button key={t} onClick={() => setTf(t)} style={{ padding: "3px 7px", fontSize: 10, fontWeight: tf === t ? 700 : 400, border: "none", cursor: "pointer", borderRadius: 3, backgroundColor: tf === t ? C.gold : "transparent", color: tf === t ? C.bg : C.t2, fontFamily: "Inter, sans-serif" }}>{t}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* MARKET INFO */}
              {coin && (
                <div style={{ display: "flex", gap: 16, padding: "6px 14px", borderBottom: "1px solid " + C.border, backgroundColor: C.bg2, fontSize: 10 }}>
                  <div><span style={{ color: C.t3 }}>24H High </span><span style={{ color: C.t2, fontWeight: 600 }}>{fmt(coin.high_24h || 0, 2)}</span></div>
                  <div><span style={{ color: C.t3 }}>24H Low </span><span style={{ color: C.t2, fontWeight: 600 }}>{fmt(coin.low_24h || 0, 2)}</span></div>
                  <div><span style={{ color: C.t3 }}>Vol </span><span style={{ color: C.t2, fontWeight: 600 }}>${(coin.total_volume || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                  <div><span style={{ color: C.t3 }}>MCap </span><span style={{ color: C.t2, fontWeight: 600 }}>${(coin.market_cap || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></div>
                </div>
              )}

              {/* CHART AREA + TRADING PANEL */}
              <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

                {/* CHART */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderBottom: "1px solid " + C.border }}>
                    <BarChart3 size={13} color={C.t3} />
                    <span style={{ fontSize: 10, color: C.t3, marginRight: 3 }}>Indicators</span>
                    <button onClick={() => setShowRSI(!showRSI)} style={{ padding: "2px 7px", fontSize: 9, border: "1px solid " + (showRSI ? C.purple : C.border), borderRadius: 3, backgroundColor: showRSI ? C.purple + "20" : "transparent", color: showRSI ? C.purple : C.t3, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>RSI</button>
                    <button onClick={() => setShowMACD(!showMACD)} style={{ padding: "2px 7px", fontSize: 9, border: "1px solid " + (showMACD ? C.gold : C.border), borderRadius: 3, backgroundColor: showMACD ? C.gold + "20" : "transparent", color: showMACD ? C.gold : C.t3, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>MACD</button>
                    <div style={{ flex: 1 }} />
                    <button onClick={loadOHLC} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                      <RefreshCw size={12} color={C.t3} />
                      <span style={{ fontSize: 9, color: C.t3 }}>Refresh</span>
                    </button>
                  </div>
                  <div style={{ flex: 1, position: "relative" }} ref={chartEl}>
                    {loading && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: C.bg, zIndex: 10 }}>
                        <RefreshCw size={22} color={C.gold} />
                        <span style={{ marginLeft: 8, color: C.t2 }}>Cargando...</span>
                      </div>
                    )}
                  </div>
                  {showRSI && (
                    <div style={{ height: 80, borderTop: "1px solid " + C.border, position: "relative" }}>
                      <span style={{ position: "absolute", top: 3, left: 7, fontSize: 8, color: C.purple, fontWeight: 600, zIndex: 2 }}>RSI (14)</span>
                      <div ref={rsiEl} style={{ width: "100%", height: "100%" }} />
                    </div>
                  )}
                  {showMACD && (
                    <div style={{ height: 80, borderTop: "1px solid " + C.border, position: "relative" }}>
                      <span style={{ position: "absolute", top: 3, left: 7, fontSize: 8, color: C.gold, fontWeight: 600, zIndex: 2 }}>MACD (12,26,9)</span>
                      <div ref={macdEl} style={{ width: "100%", height: "100%" }} />
                    </div>
                  )}
                </div>

                {/* ===== TRADING PANEL ===== */}
                <div style={{ width: 300, borderLeft: "1px solid " + C.border, backgroundColor: C.bg2, display: "flex", flexDirection: "column" }}>

                  {/* WALLET */}
                  <div style={{ padding: "10px 12px", borderBottom: "1px solid " + C.border }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                      <Wallet size={13} color={C.gold} />
                      <span style={{ fontSize: 11, fontWeight: 600 }}>Billetera</span>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <div style={{ flex: "1 1 45%", padding: "4px 6px", borderRadius: 5, backgroundColor: C.card, marginBottom: 4 }}>
                        <div style={{ fontSize: 8, color: C.t3 }}>USD</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.green }}>{fmt(wUSD, 2)}</div>
                      </div>
                      <div style={{ flex: "1 1 45%", padding: "4px 6px", borderRadius: 5, backgroundColor: C.card, marginBottom: 4 }}>
                        <div style={{ fontSize: 8, color: C.t3 }}>BTC</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>{wBTC.toFixed(6)}</div>
                      </div>
                      <div style={{ flex: "1 1 45%", padding: "4px 6px", borderRadius: 5, backgroundColor: C.card }}>
                        <div style={{ fontSize: 8, color: C.t3 }}>ETH</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.purple }}>{wETH.toFixed(6)}</div>
                      </div>
                      <div style={{ flex: "1 1 45%", padding: "4px 6px", borderRadius: 5, backgroundColor: C.card }}>
                        <div style={{ fontSize: 8, color: C.t3 }}>USDC</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.blue }}>{wUSDC.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  {/* BUY/SELL TABS */}
                  <div style={{ display: "flex", borderBottom: "1px solid " + C.border }}>
                    <button onClick={() => setSide("buy")} style={{ flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", backgroundColor: side === "buy" ? C.greenBg : "transparent", color: side === "buy" ? C.green : C.t3, borderBottom: side === "buy" ? "2px solid " + C.green : "2px solid transparent" }}>BUY</button>
                    <button onClick={() => setSide("sell")} style={{ flex: 1, padding: "7px 0", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", backgroundColor: side === "sell" ? C.redBg : "transparent", color: side === "sell" ? C.red : C.t3, borderBottom: side === "sell" ? "2px solid " + C.red : "2px solid transparent" }}>SELL</button>
                  </div>

                  {/* ORDER TYPE */}
                  <div style={{ display: "flex", gap: 2, padding: "6px 12px" }}>
                    {(["market", "limit", "stop-limit"] as OT[]).map(t => (
                      <button key={t} onClick={() => setOt(t)} style={{ flex: 1, padding: "3px 0", fontSize: 9, fontWeight: ot === t ? 700 : 400, border: "1px solid " + (ot === t ? C.border : "transparent"), cursor: "pointer", borderRadius: 3, fontFamily: "Inter, sans-serif", backgroundColor: ot === t ? C.card : "transparent", color: ot === t ? C.t1 : C.t3 }}>
                        {t === "stop-limit" ? "Stop-Lim" : t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* FORM */}
                  <div style={{ padding: "4px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                      <span style={{ color: C.t3 }}>Available</span>
                      <span style={{ color: C.t2, fontWeight: 600 }}>{side === "buy" ? fmt(avail, 2) : avail.toFixed(6) + " BTC"}</span>
                    </div>

                    {ot !== "market" && (
                      <div>
                        <label style={{ fontSize: 9, color: C.t3, display: "block", marginBottom: 2 }}>Price (USD)</label>
                        <input value={prc} onChange={e => setPrc(e.target.value)} placeholder={curP.toString()} style={inputStyle} />
                      </div>
                    )}

                    {ot === "stop-limit" && (
                      <div>
                        <label style={{ fontSize: 9, color: C.t3, display: "block", marginBottom: 2 }}>Stop Price</label>
                        <input value={stopP} onChange={e => setStopP(e.target.value)} placeholder="0.00" style={inputStyle} />
                      </div>
                    )}

                    <div>
                      <label style={{ fontSize: 9, color: C.t3, display: "block", marginBottom: 2 }}>Amount ({sym})</label>
                      <input value={amt} onChange={e => setAmt(e.target.value)} placeholder="0.00" style={inputStyle} />
                    </div>

                    <div style={{ display: "flex", gap: 3 }}>
                      {[25, 50, 75, 100].map(p => (
                        <button key={p} onClick={() => setAmt((maxA * p / 100).toFixed(6))} style={{ flex: 1, padding: "2px 0", fontSize: 9, border: "1px solid " + C.border, backgroundColor: C.card, color: C.t2, borderRadius: 3, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>{p}%</button>
                      ))}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, padding: "3px 0", borderTop: "1px solid " + C.border }}>
                      <span style={{ color: C.t3 }}>Fee (0.1%)</span>
                      <span style={{ color: C.t2 }}>${fee.toFixed(4)}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, padding: "5px 7px", borderRadius: 5, backgroundColor: C.card }}>
                      <span style={{ color: C.t2 }}>Total</span>
                      <span style={{ color: side === "buy" ? C.green : C.red }}>${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                    </div>

                    <button onClick={exec} style={{ width: "100%", padding: "9px 0", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", borderRadius: 5, fontFamily: "Inter, sans-serif", backgroundColor: side === "buy" ? C.green : C.red, color: C.bg, marginTop: 3 }}>
                      {side === "buy" ? "BUY" : "SELL"} {sym}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}