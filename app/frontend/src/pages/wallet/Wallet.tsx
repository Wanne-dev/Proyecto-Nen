/* Billetera BANCA NEN — Liquid Glass oscuro con oro metálico.
   Todos los saldos, monedas, límites y movimientos vienen de la API real. */
import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft, ArrowUpRight, CreditCard, Minus, Plus, RefreshCw, Search,
  TrendingDown, TrendingUp, Wallet as WalletIcon,
} from "lucide-react";
import { CURRENCY_DECIMALS, CURRENCY_META } from "../../constants/currencies";
import type { Transaction } from "../../services/wallet";
import { useWalletStore } from "../../store/wallet.slice";
import { fmtDate, fmtDateShort } from "../../theme";
import "./wallet.css";

const TYPE_LABELS: Record<string, string> = {
  deposit: "Depósito", withdrawal: "Retiro", trade_buy: "Compra", trade_sell: "Venta",
  transfer_in: "Transferencia recibida", transfer_out: "Transferencia enviada", fee: "Comisión", refund: "Reembolso",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente", processing: "Procesando", completed: "Completado", failed: "Fallido",
  cancelled: "Cancelado", reversed: "Revertido",
};
const CREDIT_TYPES = new Set(["deposit", "transfer_in", "trade_sell", "refund"]);
const WHOLE_FORMAT = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const USD_FORMAT = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: CURRENCY_DECIMALS[currency] ?? 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatUsd(value: number) {
  return `$${USD_FORMAT.format(Number.isFinite(value) ? value : 0)}`;
}

function splitBalance(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  const [whole, decimals] = safe.toFixed(2).split(".");
  return { whole: WHOLE_FORMAT.format(Number(whole)), decimals };
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hoy";
  if (date.toDateString() === yesterday.toDateString()) return "Ayer";
  return fmtDateShort(iso);
}

function transactionIcon(type: string) {
  if (["deposit", "transfer_in", "refund"].includes(type)) return <ArrowDownLeft size={17} />;
  if (["withdrawal", "transfer_out", "fee"].includes(type)) return <ArrowUpRight size={17} />;
  if (type === "trade_buy") return <TrendingUp size={17} />;
  if (type === "trade_sell") return <TrendingDown size={17} />;
  return <CreditCard size={17} />;
}

function percentage(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function TrendPill({ direction, value, label }: { direction: "up" | "down"; value: number | null; label: string }) {
  return (
    <span
      className={`nen-wallet__trend nen-wallet__trend--${direction}`}
      title="Últimos 30 días frente a los 30 anteriores"
    >
      {value === null ? "• Sin historial" : `${direction === "up" ? "↑" : "↓"} ${Math.abs(value).toFixed(2)}%`} {label}
    </span>
  );
}

export default function WalletPage() {
  const { wallet, transactions, summary, loading, error, refresh } = useWalletStore();
  const [raisedCard, setRaisedCard] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "in" | "out">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  const balances = useMemo(() => [...(wallet?.balances ?? [])].sort((a, b) => {
    const left = Number(a.balance) * Number(a.usdRate);
    const right = Number(b.balance) * Number(b.usdRate);
    return right - left;
  }), [wallet?.balances]);

  const activeCurrencies = balances.filter((balance) => Number(balance.balance) > 0);
  const search = query.trim().toLowerCase();
  const filteredTransactions = useMemo(() => transactions.filter((tx) => {
    if (tab === "in" && !CREDIT_TYPES.has(tx.type)) return false;
    if (tab === "out" && CREDIT_TYPES.has(tx.type)) return false;
    if (!search) return true;
    return [tx.description, TYPE_LABELS[tx.type] ?? tx.type, tx.referenceId, formatAmount(tx.amount, tx.currency)]
      .some((value) => value.toLowerCase().includes(search));
  }), [transactions, tab, search]);

  const grouped = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: Transaction[] }> = [];
    const byDay = new Map<string, number>();
    for (const tx of filteredTransactions) {
      const key = new Date(tx.createdAt).toDateString();
      let index = byDay.get(key);
      if (index === undefined) {
        index = groups.length;
        byDay.set(key, index);
        groups.push({ key, label: dayLabel(tx.createdAt), items: [] });
      }
      groups[index].items.push(tx);
    }
    return groups;
  }, [filteredTransactions]);

  const balance = splitBalance(wallet?.totalBalanceUsd ?? 0);
  const status = wallet?.isActive === false ? "Inactiva" : "Activa";
  const dailyLimit = Number(wallet?.dailyWithdrawalLimit ?? 0);
  const resetDay = wallet?.dailyWithdrawnReset
    ? new Date(wallet.dailyWithdrawnReset).toDateString()
    : null;
  const dailyUsed = resetDay && resetDay === new Date().toDateString()
    ? Number(wallet?.dailyWithdrawn ?? 0)
    : 0;
  const limitPercent = dailyLimit > 0 ? Math.min(100, (dailyUsed / dailyLimit) * 100) : 0;
  const incomeTrend = summary ? percentage(summary.current.income, summary.previous.income) : null;
  const expenseTrend = summary ? percentage(summary.current.expense, summary.previous.expense) : null;

  function handleGleam(event: MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    event.currentTarget.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  }

  return (
    <div className="nen-wallet">
      {error && <div role="alert" className="nen-wallet__error">{error}</div>}

      <div className="nen-wallet__grid">
        <section className="nen-wallet__col" aria-labelledby="wallet-cards-title">
          <div className="nen-wallet__section-head">
            <div>
              <h1 id="wallet-cards-title" className="nen-wallet__title">Mis Billeteras</h1>
              <p className="nen-wallet__subtitle">Saldos y monedas de tu cuenta.</p>
            </div>
            <button type="button" className="nen-wallet__refresh" onClick={() => void refresh()} disabled={loading}
              aria-label="Actualizar billetera" title="Actualizar billetera">
              <RefreshCw size={15} />
            </button>
          </div>

          <div className="nen-wallet__cards">
            {balances.length ? balances.map((item, index) => {
              const meta = CURRENCY_META[item.currency] ?? { name: item.currency, icon: "$", color: "#D4AF37" };
              const available = Math.max(0, Number(item.balance) - Number(item.lockedAmount));
              const usdValue = Number(item.balance) * Number(item.usdRate);
              const raised = raisedCard ? raisedCard === item.currency : index === 0;
              return (
                <button
                  type="button"
                  key={item.currency}
                  className="nen-wallet__card"
                  style={{ "--card-accent": meta.color } as CSSProperties}
                  data-raised={raised ? "true" : "false"}
                  onClick={() => setRaisedCard(item.currency)}
                  onMouseMove={handleGleam}
                  aria-label={`Billetera ${meta.name}: ${formatAmount(Number(item.balance), item.currency)} ${item.currency}`}
                >
                  <span className="nen-wallet__card-top">
                    <span className="nen-wallet__brand">BANCA NEN <i>|</i> {meta.name}</span>
                    <span className="nen-wallet__card-code">{meta.icon} {item.currency}</span>
                  </span>
                  <span className="nen-wallet__card-balance">
                    <span className="nen-wallet__card-amount">{formatAmount(Number(item.balance), item.currency)}</span>
                    <span className="nen-wallet__card-currency">{item.currency}</span>
                  </span>
                  <span className="nen-wallet__card-bottom">
                    <span><small>DISPONIBLE</small><strong>{formatAmount(available, item.currency)} {item.currency}</strong></span>
                    <span><small>VALOR EN USD</small><strong>{Number(item.usdRate) > 0 ? formatUsd(usdValue) : "Sin cotización"}</strong></span>
                  </span>
                </button>
              );
            }) : (
              <div className="nen-wallet__card nen-wallet__card--empty" aria-live="polite">
                <WalletIcon size={22} />
                <strong>{loading ? "Cargando billeteras…" : "Aún no hay saldos"}</strong>
                <span>Realiza un depósito para empezar a operar.</span>
              </div>
            )}
          </div>

          <section className="nen-wallet__balance" aria-labelledby="wallet-balance-label">
            <p id="wallet-balance-label" className="nen-wallet__label">Balance total</p>
            <div className="nen-wallet__amount" aria-live="polite">
              {wallet ? (
                <>
                  <span>$</span>
                  <span className="nen-wallet__amount-int">{balance.whole}</span>
                  <span className="nen-wallet__amount-dec">,{balance.decimals}</span>
                  <span className="nen-wallet__amount-currency">USD</span>
                </>
              ) : (
                <span>{loading ? "Cargando…" : "—"}</span>
              )}
            </div>
            <div className="nen-wallet__trends">
              <TrendPill direction="up" value={incomeTrend} label="ingresos" />
              <TrendPill direction="down" value={expenseTrend} label="egresos" />
            </div>

            <div className="nen-wallet__divider" />

            <div className="nen-wallet__meta">
              <div>
                <p className="nen-wallet__meta-label">Monedas activas</p>
                <div className="nen-wallet__chips">
                  {activeCurrencies.length ? activeCurrencies.map((item) => (
                    <span key={item.currency} className="nen-wallet__chip-small"
                      title={CURRENCY_META[item.currency]?.name ?? item.currency}>
                      {item.currency}
                    </span>
                  )) : <span className="nen-wallet__muted">Sin saldo</span>}
                </div>
              </div>
              <div>
                <p className="nen-wallet__meta-label">Estado</p>
                <p className="nen-wallet__meta-value"><span className="nen-wallet__status-dot" />{status}</p>
              </div>
            </div>

            <div className="nen-wallet__limit">
              <div className="nen-wallet__limit-head">
                <span>Límite diario de retiro</span>
                <strong>{formatUsd(dailyUsed)} / {formatUsd(dailyLimit)}</strong>
              </div>
              <div className="nen-wallet__limit-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100}
                aria-valuenow={Math.round(limitPercent)} aria-label="Uso del límite diario de retiro">
                <span style={{ width: `${limitPercent}%` }} />
              </div>
            </div>

            <div className="nen-wallet__quick">
              <Link to="/wallet/deposit"><Plus size={13} /> Depositar</Link>
              <Link to="/wallet/withdraw"><Minus size={13} /> Retirar</Link>
            </div>
          </section>
        </section>

        <section className="nen-wallet__col" aria-labelledby="wallet-payments-title">
          <div className="nen-wallet__section-head">
            <div>
              <h2 id="wallet-payments-title" className="nen-wallet__title">Movimientos</h2>
              <p className="nen-wallet__subtitle">Actividad real de tu billetera.</p>
            </div>
          </div>

          <div className="nen-wallet__toolbar">
            <div className="nen-wallet__tabs" role="tablist" aria-label="Filtro de movimientos">
              <button type="button" id="nen-wallet-tab-all" role="tab" className="nen-wallet__tab"
                aria-selected={tab === "all"} aria-controls="nen-wallet-panel"
                onClick={() => setTab("all")}>Todos</button>
              <button type="button" id="nen-wallet-tab-in" role="tab" className="nen-wallet__tab"
                aria-selected={tab === "in"} aria-controls="nen-wallet-panel"
                onClick={() => setTab("in")}>Ingresos</button>
              <button type="button" id="nen-wallet-tab-out" role="tab" className="nen-wallet__tab"
                aria-selected={tab === "out"} aria-controls="nen-wallet-panel"
                onClick={() => setTab("out")}>Egresos</button>
            </div>
            <label className="nen-wallet__search">
              <Search size={14} aria-hidden="true" />
              <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar..." aria-label="Buscar movimientos" />
            </label>
          </div>

          <div className="nen-wallet__list" id="nen-wallet-panel" role="tabpanel"
            aria-labelledby={`nen-wallet-tab-${tab}`}>
            {grouped.length ? grouped.map((group) => (
              <div key={group.key}>
                <p className="nen-wallet__group-label">{group.label}</p>
                {group.items.map((tx) => {
                  const credit = CREDIT_TYPES.has(tx.type);
                  return (
                    <div className="nen-wallet__row" key={tx.id}>
                      <span className="nen-wallet__row-icon" aria-hidden="true">{transactionIcon(tx.type)}</span>
                      <span>
                        <span className="nen-wallet__row-name">{tx.description || TYPE_LABELS[tx.type] || tx.type}</span>
                        <span className="nen-wallet__row-date">
                          {fmtDate(tx.createdAt)} · {STATUS_LABELS[tx.status] || tx.status}
                        </span>
                      </span>
                      <span className={`nen-wallet__row-amount ${credit ? "nen-wallet__row-amount--in" : "nen-wallet__row-amount--out"}`}>
                        {credit ? "+" : "−"}{formatAmount(tx.amount, tx.currency)} {tx.currency}
                      </span>
                    </div>
                  );
                })}
              </div>
            )) : (
              <p className="nen-wallet__empty">
                {loading ? "Cargando movimientos…" : search ? "No hay movimientos que coincidan." : "Aún no hay movimientos."}
              </p>
            )}
          </div>

          <section className="nen-wallet__period" aria-labelledby="wallet-period-title">
            <div className="nen-wallet__period-head">
              <h3 id="wallet-period-title">Últimos 30 días</h3>
              <span>{summary?.current.count ?? 0} movimientos</span>
            </div>
            <div className="nen-wallet__period-grid">
              <div>
                <span>Ingresos</span>
                <strong className="nen-wallet__period-in">{formatUsd(summary?.current.income ?? 0)}</strong>
              </div>
              <div>
                <span>Egresos</span>
                <strong>{formatUsd(summary?.current.expense ?? 0)}</strong>
              </div>
            </div>
          </section>
        </section>
      </div>
    </div>
  );
}
