import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, Bitcoin, CandlestickChart, CheckCircle2, Clock3, Coins, RefreshCw, ShieldCheck } from "lucide-react";
import { useMarketFeed, useSpotQuotes } from "../../hooks/useMarketFeed";
import { MARKET_ASSETS, MARKET_RANGES, formatDelta, formatQuote, formatUsd, getBook, getCandles, type BookLevel, type MarketAsset, type MarketRange } from "../../services/market";
import { getCurrencyMeta } from "../../constants/currencies";
import { useWalletStore } from "../../store/wallet.slice";
import { useTradingStore } from "../../store/trading.slice";
import PriceChart from "../../components/charts/PriceChart";
import OrderForm from "../../components/trading/OrderForm";
import MarketStatus, { marketMessage } from "../../components/common/MarketStatus";
import type { Order } from "../../services/orders";
import type { OrderSide } from "../../types/Order.types";
import "./trading.css";

const ranges: Record<MarketRange, string> = { "24h": "24 h", "7d": "7 días", "30d": "30 días" };
const units = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 8 });
const intervalLabel = (minutes: number) => minutes < 60 ? `${minutes} min` : `${minutes / 60} h`;

function AssetIcon({ asset }: { asset: MarketAsset }) {
  if (asset === "BTC") return <Bitcoin size={19} />;
  if (asset === "ETH") return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="m12 1-6.9 11.2L12 16.3l6.9-4.1L12 1Zm0 16.8-6.9-4.1L12 23l6.9-9.3-6.9 4.1Z" />
  </svg>;
  return <span>$</span>;
}

function EmptyMarket({ title, loading = false }: { title: string; loading?: boolean }) {
  return <div className="nen-market__empty" role="status">
    <CandlestickChart size={23} aria-hidden="true" />
    <p>{title}</p>
    {!loading && <span>No se muestran datos de ejemplo.</span>}
  </div>;
}

function BookTable({ levels, symbol, side }: { levels: BookLevel[]; symbol: MarketAsset; side: "asks" | "bids" }) {
  return <table className="nen-market__book-table">
    <caption className={side === "bids" ? "text-emerald-300" : "text-rose-300"}>{side === "bids" ? "Compras" : "Ventas"}</caption>
    <thead><tr><th scope="col">Precio (USD)</th><th scope="col">Cantidad ({symbol})</th></tr></thead>
    <tbody>{levels.map(({ price, quantity }) => <tr key={price}><td>{formatQuote(price, symbol)}</td><td>{units.format(quantity)}</td></tr>)}</tbody>
  </table>;
}

export default function Trading() {
  const [asset, setAsset] = useState<MarketAsset>("BTC");
  const [range, setRange] = useState<MarketRange>("24h");
  const [submitting, setSubmitting] = useState(false);
  const [execution, setExecution] = useState<Order | null>(null);
  const [orderError, setOrderError] = useState("");
  const quotes = useSpotQuotes();
  const chart = useMarketFeed(useCallback((signal: AbortSignal) => getCandles(asset, range, signal), [asset, range]), 65_000);
  const book = useMarketFeed(useCallback((signal: AbortSignal) => getBook(asset, signal), [asset]));
  const wallet = useWalletStore((s) => s.wallet);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const placeOrder = useTradingStore((s) => s.placeOrder);

  useEffect(() => { void refreshWallet(); }, [refreshWallet]);
  const balance = (currency: string) => {
    const value = wallet?.balances.find((item) => item.currency === currency);
    return Math.max(0, Number(value?.balance ?? 0) - Number(value?.lockedAmount ?? 0));
  };
  const quote = quotes.snapshot?.data?.[asset];
  const tradablePrice = quotes.snapshot?.status === "fresh" ? quote?.price ?? null : null;
  const series = chart.snapshot?.data;

  const submit = async ({ side, quantity }: { side: OrderSide; quantity: number }) => {
    if (tradablePrice === null || submitting) return;
    setSubmitting(true); setOrderError(""); setExecution(null);
    try {
      setExecution(await placeOrder({ type: "market", side, symbol: asset, quantity }));
      void refreshWallet();
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "No se pudo registrar la orden.");
      quotes.reload();
    } finally { setSubmitting(false); }
  };

  return (
    <section className="nen-market" aria-labelledby="market-title">
      <div className="nen-market__intro">
        <div>
          <p className="nen-market__eyebrow"><CandlestickChart size={16} aria-hidden="true" /> MERCADO SPOT</p>
          <h1 id="market-title">Mercado cripto</h1>
          <p>Precios e históricos de Kraken, con operaciones de práctica.</p>
        </div>
        <div className="nen-market__shortcuts">
          <Link className="nen-market__action" to="/trading/history"><Clock3 size={15} aria-hidden="true" /> Historial</Link>
          <button className="nen-market__action" type="button" disabled={quotes.busy || chart.busy || book.busy}
            onClick={() => { quotes.reload(); chart.reload(); book.reload(); }}><RefreshCw size={15} aria-hidden="true" /> Actualizar</button>
        </div>
      </div>

      <div className="nen-market__assets" role="group" aria-label="Pares en dólares">
        {MARKET_ASSETS.map((symbol) => {
          const meta = getCurrencyMeta(symbol);
          const current = quotes.snapshot?.data?.[symbol];
          return <button type="button" className="nen-market__asset" key={symbol} aria-pressed={symbol === asset}
            aria-label={`Seleccionar ${symbol}`} disabled={submitting}
            onClick={() => { setAsset(symbol); setExecution(null); setOrderError(""); }}>
            <span className="nen-market__coin-icon" style={{ color: meta.color, backgroundColor: `${meta.color}22` }} aria-hidden="true"><AssetIcon asset={symbol} /></span>
            <span><strong>{symbol}</strong><small>{meta.name}</small></span>
            <span className="nen-market__asset-price"><strong>{current ? `$${formatQuote(current.price, symbol)}` : "—"}</strong>
              {current ? <small className={current.changeDayPct >= 0 ? "text-emerald-300" : "text-rose-300"}>{formatDelta(current.changeDayPct)} hoy</small>
                : <small>{quotes.snapshot ? "Sin cotización" : "Consultando…"}</small>}</span>
          </button>;
        })}
      </div>

      <div className="nen-market__grid">
        <section className="nen-market__surface nen-market__chart" aria-labelledby="market-pair">
          <div className="nen-market__section-head">
            <div>
              <h2 id="market-pair">{getCurrencyMeta(asset).name} <span>{asset}/USD</span></h2>
              <div className="nen-market__price" data-testid="spot-price">{quote ? `$${formatQuote(quote.price, asset)}` : "—"}
                {quote && <span className={quote.changeDayPct >= 0 ? "text-emerald-300" : "text-rose-300"}>
                  {quote.changeDayPct >= 0 ? <ArrowUpRight size={15} aria-hidden="true" /> : <ArrowDownRight size={15} aria-hidden="true" />}
                  {formatDelta(quote.changeDayPct)} <small>desde 00:00 UTC</small>
                </span>}
              </div>
              <div className="nen-market__meta"><MarketStatus snapshot={quotes.snapshot} /></div>
            </div>
            <div className="nen-market__ranges" role="group" aria-label="Período del gráfico">
              {MARKET_RANGES.map((value) => <button type="button" key={value} aria-pressed={value === range} onClick={() => setRange(value)}>{ranges[value]}</button>)}
            </div>
          </div>

          <dl className="nen-market__stats">
            <div><dt>Máximo · 24 h</dt><dd>{quote ? `$${formatQuote(quote.high24h, asset)}` : "—"}</dd></div>
            <div><dt>Mínimo · 24 h</dt><dd>{quote ? `$${formatQuote(quote.low24h, asset)}` : "—"}</dd></div>
            <div><dt>Volumen · 24 h</dt><dd>{quote ? `${quote.volume24h.toLocaleString("es-CO", { maximumFractionDigits: 2 })} ${asset}` : "—"}</dd></div>
          </dl>

          {series ? <figure>
            <PriceChart key={`${asset}:${range}`} data={series.points} precision={asset === "USDC" ? 4 : 2} />
            <figcaption className="nen-market__caption">
              <span>Velas de {intervalLabel(series.intervalMinutes)} · Volumen en {asset} · Eje horario UTC</span>
              <MarketStatus snapshot={chart.snapshot} />
            </figcaption>
            <p className="sr-only">Último cierre del gráfico: {formatQuote(series.points[series.points.length - 1].close, asset)} USD.</p>
          </figure> : <EmptyMarket title={chart.snapshot ? marketMessage(chart.snapshot) : "Cargando el gráfico…"} loading={!chart.snapshot} />}
        </section>

        <section className="nen-market__surface nen-market__trade" aria-labelledby="trade-title">
          <div className="nen-market__trade-head">
            <span className="nen-market__trade-symbol"><Coins size={18} aria-hidden="true" /></span>
            <div><h2 id="trade-title">Operar {asset}</h2><p><ShieldCheck size={13} aria-hidden="true" /> Solo saldo virtual</p></div>
          </div>
          <OrderForm key={asset} symbol={asset} indicativePrice={tradablePrice} buyAvailable={balance("USD")} sellAvailable={balance(asset)} submitting={submitting} onSubmit={submit} />
          {orderError && <p className="nen-market__order-error" role="alert">{orderError}</p>}
          {execution && <div className="nen-market__execution" role="status">
            <strong><CheckCircle2 size={16} aria-hidden="true" /> {execution.side === "buy" ? "Compra" : "Venta"} simulada registrada</strong>
            <p>{execution.quantity} {execution.asset} · {formatQuote(execution.price, asset)} USD por unidad</p>
            <p>Referencia de Kraken · Comisión: {formatUsd(execution.fee)} USD</p>
            <Link to="/trading/history">Ver historial de órdenes</Link>
          </div>}
        </section>
      </div>

      <section className="nen-market__surface nen-market__book" aria-labelledby="book-title">
        <div className="nen-market__section-head">
          <div><h2 id="book-title">Libro de órdenes <span>{asset}/USD</span></h2>
            <p className="nen-market__meta">Ofertas reales en Kraken; no corresponden a tus órdenes virtuales.</p></div>
          <p className="nen-market__meta"><MarketStatus snapshot={book.snapshot} /></p>
        </div>
        {book.snapshot?.data ? <div className="nen-market__book-grid">
          <BookTable side="bids" levels={book.snapshot.data.bids} symbol={asset} />
          <BookTable side="asks" levels={book.snapshot.data.asks} symbol={asset} />
        </div> : <p role="status" className="nen-market__meta mt-4">{book.snapshot ? "No hay ofertas disponibles para mostrar." : "Cargando ofertas…"}</p>}
      </section>
    </section>
  );
}
