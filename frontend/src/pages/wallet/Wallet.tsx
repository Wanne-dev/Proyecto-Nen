// Archivo: frontend/src/pages/wallet/Wallet.tsx
// Prop�sito: P�gina de billetera
import { useState, useEffect, useCallback, useRef, Component, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Wallet, ArrowUpRight, ArrowDownRight, RefreshCw,
  Shield, Bell, Settings, LayoutDashboard, TrendingUp, User,
  AlertCircle, LogOut, Plus, Minus, ArrowRight, Clock,
  CheckCircle, XCircle, Loader
} from "lucide-react";
import {
  getWallet, depositFunds, withdrawFunds, getTransactions,
  type WalletData
} from "@/services/wallet";
import { useAuthStore } from "@/store/auth.slice";

/* ===== ERROR BOUNDARY ===== */
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
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Error en Wallet</h2>
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

/* ===== COLORES BANCA NEN ===== */
const C = {
  bg: "#0A0A0F", bg2: "#0E0E18", card: "#1A1A2E", border: "#2A2A4A",
  green: "#00FFAA", greenBg: "#00FFAA15", red: "#FF3355", redBg: "#FF335515",
  gold: "#F59E0B", blue: "#3B82F6", purple: "#8B5CF6",
  t1: "#FFFFFF", t2: "#A0A0B8", t3: "#6B6B80",
};

/* ===== MONEDAS CON METADATOS ===== */
const CURRENCY_META: Record<string, { name: string; icon: string; color: string; decimals: number }> = {
  USD: { name: "Dolar US", icon: "$", color: C.green, decimals: 2 },
  COP: { name: "Peso Colombiano", icon: "$", color: C.gold, decimals: 0 },
  EUR: { name: "Euro", icon: "\u20AC", color: C.blue, decimals: 2 },
  BTC: { name: "Bitcoin", icon: "\u20BF", color: C.gold, decimals: 8 },
  ETH: { name: "Ethereum", icon: "\u039E", color: C.purple, decimals: 6 },
  USDC: { name: "USD Coin", icon: "$", color: C.blue, decimals: 2 },
};

/* ===== INTERFACES ===== */
interface Transaction {
  id: string;
  type: string;
  currency: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
}

/* ===== HELPERS ===== */
function fmtCurrency(amount: number, currency: string) {
  const meta = CURRENCY_META[currency];
  if (!meta) return amount.toLocaleString();
  return meta.icon + " " + amount.toLocaleString(undefined, {
    minimumFractionDigits: meta.decimals > 2 ? 2 : meta.decimals,
    maximumFractionDigits: meta.decimals,
  });
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
    + " " + d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

const TYPE_LABELS: Record<string, string> = {
  deposit: "Deposito",
  withdrawal: "Retiro",
  transfer_in: "Transferencia entrada",
  transfer_out: "Transferencia salida",
  trade_buy: "Compra",
  trade_sell: "Venta",
  fee: "Comision",
  refund: "Reembolso",
};

const STATUS_META: Record<string, { label: string; color: string; Icon: typeof CheckCircle }> = {
  pending: { label: "Pendiente", color: C.gold, Icon: Clock },
  processing: { label: "Procesando", color: C.blue, Icon: Loader },
  completed: { label: "Completado", color: C.green, Icon: CheckCircle },
  failed: { label: "Fallido", color: C.red, Icon: XCircle },
  cancelled: { label: "Cancelado", color: C.t3, Icon: XCircle },
  reversed: { label: "Revertido", color: C.gold, Icon: Clock },
};

/* ===== COMPONENTE PRINCIPAL ===== */
export default function WalletPage() {
  const { user, token } = useAuthStore();
  const loc = useLocation();
  const nav = useNavigate();

  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Modal deposit/withdraw */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"deposit" | "withdraw">("deposit");
  const [modalCurrency, setModalCurrency] = useState("USD");
  const [modalAmount, setModalAmount] = useState("");
  const [modalDesc, setModalDesc] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");

  /* ----- Cargar billetera ----- */
  const loadWallet = useCallback(async () => {
    if (!token) {
      setError("Sesion expirada. Inicia sesion de nuevo.");
      return;
    }
    try {
      setError("");
      const w = await getWallet(token);
      setWalletData(w);
    } catch (e: any) {
      if (e.message?.includes("401")) {
        setError("Sesion expirada (401). Inicia sesion de nuevo.");
      } else {
        setError(e.message || "Error cargando billetera");
      }
    }
  }, [token]);

  /* ----- Cargar transacciones ----- */
  const loadTransactions = useCallback(async () => {
    if (!token) return;
    try {
      const t = await getTransactions(token, 1, 50);
      const raw: any[] = Array.isArray(t) ? t : Array.isArray((t as any)?.data) ? (t as any).data : [];
      setTransactions(raw.map((tx) => ({ ...tx, amount: Number(tx.amount), fee: Number(tx.fee || 0) })) as any);
    } catch (e: any) {
      console.error("Transactions error:", e);
      setTransactions([]);
    }
  }, [token]);

  /* ----- Cargar todo ----- */
  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadWallet(), loadTransactions()]);
    setLoading(false);
  }, [loadWallet, loadTransactions]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* Refresco automatico cada 30s */
  useEffect(() => {
    const iv = setInterval(loadAll, 30000);
    return () => clearInterval(iv);
  }, [loadAll]);

  /* ----- Abrir modal ----- */
  const openModal = (mode: "deposit" | "withdraw", currency: string) => {
    setModalMode(mode);
    setModalCurrency(currency);
    setModalAmount("");
    setModalDesc("");
    setModalError("");
    setModalSubmitting(false);
    setModalOpen(true);
  };

  /* ----- Ejecutar deposit/withdraw ----- */
  const execModal = async () => {
    const amount = parseFloat(modalAmount);
    if (!amount || amount <= 0) {
      setModalError("Ingresa un monto valido");
      return;
    }
    if (!token) {
      setModalError("Sesion expirada");
      return;
    }
    setModalSubmitting(true);
    setModalError("");
    try {
      const desc = modalDesc || (modalMode === "deposit" ? "Deposito" : "Retiro") + " " + modalCurrency;
      if (modalMode === "deposit") {
        await depositFunds(token, modalCurrency, amount, desc);
      } else {
        await withdrawFunds(token, modalCurrency, amount, desc);
      }
      setModalOpen(false);
      await loadAll();
    } catch (e: any) {
      setModalError(e.message || "Error en la operacion");
    }
    setModalSubmitting(false);
  };

  /* ----- Balances derivados ----- */
  const balances = walletData?.balances || [];
  const getBalance = (cur: string) => Number(balances.find(b => b.currency === cur)?.balance || 0);

  /* Total USD aproximado (solo fiat por ahora) */
  const totalFiat = getBalance("USD") + getBalance("USDC") + getBalance("COP") * 0.00025 + getBalance("EUR") * 1.09;

  const logout = () => {
    useAuthStore.getState().logout();
    nav("/login");
  };

  const inputStyle = {
    width: "100%", padding: "8px 10px", fontSize: 12, borderRadius: 6,
    backgroundColor: C.card, border: "1px solid " + C.border, color: C.t1,
    outline: "none", fontFamily: "Inter, sans-serif" as const,
  };

  return (
    <ErrorBoundary>
      <div style={{ fontFamily: "Inter, sans-serif" }}>

        {/* Errores se muestran como toast en el layout */}
        <div style={{ padding: 20 }}>
          {/* ===== CONTENIDO ===== */}
          <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>

            {loading && !walletData ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 8 }}>
                <RefreshCw size={22} color={C.gold} />
                <span style={{ color: C.t2 }}>Cargando billetera...</span>
              </div>
            ) : (
              <>
                {/* ===== HEADER: Total + Botones ===== */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.t3, marginBottom: 4 }}>Balance Total (Fiat)</div>
                    <div style={{ fontSize: 28, fontWeight: 700 }}>${totalFiat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => openModal("deposit", "USD")} style={{ padding: "8px 20px", fontSize: 12, fontWeight: 700, backgroundColor: C.green, color: C.bg, border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
                      <Plus size={14} /> Depositar
                    </button>
                    <button onClick={() => openModal("withdraw", "USD")} style={{ padding: "8px 20px", fontSize: 12, fontWeight: 700, backgroundColor: C.red, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", gap: 6 }}>
                      <Minus size={14} /> Retirar
                    </button>
                    <button onClick={loadAll} style={{ padding: "8px 12px", fontSize: 12, backgroundColor: C.card, color: C.t2, border: "1px solid " + C.border, borderRadius: 6, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                {/* ===== BALANCE CARDS ===== */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 28 }}>
                  {Object.entries(CURRENCY_META).map(([cur, meta]) => {
                    const bal = getBalance(cur);
                    if (bal === 0 && !["USD", "BTC", "ETH", "USDC"].includes(cur)) return null;
                    return (
                      <div key={cur} style={{ backgroundColor: C.card, borderRadius: 8, border: "1px solid " + C.border, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: meta.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: meta.color }}>
                              {meta.icon}
                            </div>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{cur}</div>
                              <div style={{ fontSize: 9, color: C.t3 }}>{meta.name}</div>
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: bal > 0 ? meta.color : C.t3 }}>
                          {fmtCurrency(bal, cur)}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => openModal("deposit", cur)} style={{ flex: 1, padding: "4px 0", fontSize: 10, fontWeight: 600, backgroundColor: C.greenBg, color: C.green, border: "1px solid " + C.green + "40", borderRadius: 4, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                            <Plus size={10} /> Dep
                          </button>
                          <button onClick={() => openModal("withdraw", cur)} style={{ flex: 1, padding: "4px 0", fontSize: 10, fontWeight: 600, backgroundColor: C.redBg, color: C.red, border: "1px solid " + C.red + "40", borderRadius: 4, cursor: "pointer", fontFamily: "Inter, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                            <Minus size={10} /> Ret
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ===== TRANSACCIONES ===== */}
                <div style={{ backgroundColor: C.card, borderRadius: 8, border: "1px solid " + C.border, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Clock size={14} color={C.gold} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Transacciones Recientes</span>
                    </div>
                    <span style={{ fontSize: 10, color: C.t3 }}>{transactions.length} registros</span>
                  </div>

                  {transactions.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center", color: C.t3, fontSize: 12 }}>
                      No hay transacciones aun
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ backgroundColor: C.bg2 }}>
                            <th style={{ padding: "8px 12px", textAlign: "left", color: C.t3, fontWeight: 600 }}>Tipo</th>
                            <th style={{ padding: "8px 12px", textAlign: "left", color: C.t3, fontWeight: 600 }}>Moneda</th>
                            <th style={{ padding: "8px 12px", textAlign: "right", color: C.t3, fontWeight: 600 }}>Monto</th>
                            <th style={{ padding: "8px 12px", textAlign: "left", color: C.t3, fontWeight: 600 }}>Estado</th>
                            <th style={{ padding: "8px 12px", textAlign: "left", color: C.t3, fontWeight: 600 }}>Descripcion</th>
                            <th style={{ padding: "8px 12px", textAlign: "right", color: C.t3, fontWeight: 600 }}>Fecha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((tx, i) => {
                            const isPositive = ["deposit", "transfer_in", "trade_buy", "refund"].includes(tx.type);
                            const sMeta = STATUS_META[tx.status] || { label: tx.status, color: C.t3, Icon: Clock };
                            const SIcon = sMeta.Icon;
                            return (
                              <tr key={tx.id || i} style={{ borderTop: "1px solid " + C.border }}>
                                <td style={{ padding: "8px 12px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    {isPositive ? <ArrowUpRight size={12} color={C.green} /> : <ArrowDownRight size={12} color={C.red} />}
                                    <span>{TYPE_LABELS[tx.type] || tx.type}</span>
                                  </div>
                                </td>
                                <td style={{ padding: "8px 12px" }}>
                                  <span style={{ padding: "2px 6px", borderRadius: 3, backgroundColor: (CURRENCY_META[tx.currency]?.color || C.t3) + "20", color: CURRENCY_META[tx.currency]?.color || C.t3, fontSize: 10, fontWeight: 600 }}>
                                    {tx.currency}
                                  </span>
                                </td>
                                <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: isPositive ? C.green : C.red }}>
                                  {isPositive ? "+" : "-"}{fmtCurrency(Math.abs(tx.amount), tx.currency)}
                                </td>
                                <td style={{ padding: "8px 12px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: sMeta.color, fontSize: 10 }}>
                                    <SIcon size={10} />
                                    <span>{sMeta.label}</span>
                                  </div>
                                </td>
                                <td style={{ padding: "8px 12px", color: C.t2, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {tx.description || "-"}
                                </td>
                                <td style={{ padding: "8px 12px", textAlign: "right", color: C.t3, fontSize: 10 }}>
                                  {tx.createdAt ? fmtDate(tx.createdAt) : "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ===== MODAL DEPOSITAR / RETIRAR ===== */}
        {modalOpen && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setModalOpen(false)}>
            <div style={{ backgroundColor: C.bg2, borderRadius: 10, border: "1px solid " + C.border, width: 380, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {modalMode === "deposit" ? <Plus size={16} color={C.green} /> : <Minus size={16} color={C.red} />}
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{modalMode === "deposit" ? "Depositar" : "Retirar"}</span>
                </div>
                <button onClick={() => setModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.t3, fontSize: 18, fontFamily: "Inter, sans-serif" }}>&times;</button>
              </div>

              {/* Body */}
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Moneda */}
                <div>
                  <label style={{ fontSize: 10, color: C.t3, display: "block", marginBottom: 4 }}>Moneda</label>
                  <select value={modalCurrency} onChange={e => setModalCurrency(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                    {Object.entries(CURRENCY_META).map(([cur, meta]) => (
                      <option key={cur} value={cur}>{cur} - {meta.name}</option>
                    ))}
                  </select>
                </div>

                {/* Monto */}
                <div>
                  <label style={{ fontSize: 10, color: C.t3, display: "block", marginBottom: 4 }}>Monto</label>
                  <input type="number" value={modalAmount} onChange={e => setModalAmount(e.target.value)} placeholder="0.00" min="0" step="any" style={inputStyle} />
                  {modalMode === "withdraw" && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9 }}>
                      <span style={{ color: C.t3 }}>Disponible:</span>
                      <span style={{ color: C.t2, fontWeight: 600 }}>{fmtCurrency(getBalance(modalCurrency), modalCurrency)}</span>
                    </div>
                  )}
                </div>

                {/* Descripcion */}
                <div>
                  <label style={{ fontSize: 10, color: C.t3, display: "block", marginBottom: 4 }}>Descripcion (opcional)</label>
                  <input value={modalDesc} onChange={e => setModalDesc(e.target.value)} placeholder={modalMode === "deposit" ? "Deposito " + modalCurrency : "Retiro " + modalCurrency} style={inputStyle} />
                </div>

                {/* Error */}
                {modalError && (
                  <div style={{ padding: "6px 10px", borderRadius: 4, backgroundColor: C.redBg, border: "1px solid " + C.red + "40", color: C.red, fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}>
                    <AlertCircle size={12} />
                    {modalError}
                  </div>
                )}

                {/* Preview */}
                {parseFloat(modalAmount) > 0 && (
                  <div style={{ padding: 10, borderRadius: 6, backgroundColor: C.card, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: C.t2 }}>Total</span>
                    <span style={{ fontWeight: 700, color: modalMode === "deposit" ? C.green : C.red }}>
                      {modalMode === "deposit" ? "+" : "-"}{fmtCurrency(parseFloat(modalAmount), modalCurrency)}
                    </span>
                  </div>
                )}

                {/* Boton ejecutar */}
                <button
                  onClick={execModal}
                  disabled={modalSubmitting}
                  style={{
                    width: "100%", padding: "10px 0", fontSize: 13, fontWeight: 700, border: "none", cursor: modalSubmitting ? "wait" : "pointer", borderRadius: 6, fontFamily: "Inter, sans-serif",
                    backgroundColor: modalMode === "deposit" ? C.green : C.red,
                    color: modalMode === "deposit" ? C.bg : "#fff",
                    opacity: modalSubmitting ? 0.7 : 1,
                  }}
                >
                  {modalSubmitting ? "Procesando..." : (modalMode === "deposit" ? "Depositar" : "Retirar") + " " + modalCurrency}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}