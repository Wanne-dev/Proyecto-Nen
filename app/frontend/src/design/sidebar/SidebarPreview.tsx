import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Bitcoin, Clock3, Command, LockKeyhole, ScrollText, UserRound, Users, Wallet } from "lucide-react";
import { Link, MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import PortalFrame from "../../components/layout/PortalFrame";
import { ACCOUNT_SECTION, sidebarCurrent, sidebarSections, type SidebarAccount } from "../../components/layout/sidebarNavigation";
import { btcSnapshot } from "./snapshot";
import "../../index.css";
import "./sidebar-preview.css";

const ACCOUNTS = {
  user: { firstName: "Valentina", lastName: "Torres", role: "user", isVerified: true },
  admin: { firstName: "Samuel", lastName: "Mendoza", role: "admin", isVerified: true },
} satisfies Record<string, SidebarAccount>;
type PreviewRole = keyof typeof ACCOUNTS;
const fmt = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lastPrice = btcSnapshot[btcSnapshot.length - 1][4];
const change = (lastPrice / btcSnapshot[0][1] - 1) * 100;
const range = [Math.min(...btcSnapshot.map((row) => row[3])), Math.max(...btcSnapshot.map((row) => row[2]))] as const;

function Chart() {
  const x = (i: number) => (i + .5) * 616 / btcSnapshot.length;
  const bottom = 206;
  const y = (price: number) => 12 + (65_800 - price) * 185 / 2080;
  return <figure className="lgv-chart">
    <svg viewBox="0 0 700 232" role="img" aria-label={`Gráfico histórico de 24 velas horarias de Bitcoin. Mínimo ${fmt.format(range[0])} y máximo ${fmt.format(range[1])} dólares.`}>
      {[65_800, 65_280, 64_760, 64_240, 63_720].map((price) => (
        <g key={price}><line x1="0" x2="616" y1={y(price)} y2={y(price)} className="lgv-gridline" />
          <text x="630" y={y(price) + 4} className="lgv-axis">{fmt.format(price)}</text></g>
      ))}
      {[0, 1, 2, 3, 4].map((index) => <line key={index} x1={index * 154} x2={index * 154} y1="12" y2={bottom} className="lgv-gridline" />)}
      <line x1="0" x2="616" y1={y(lastPrice)} y2={y(lastPrice)} className="lgv-reference" />
      {btcSnapshot.map(([time, open, high, low, close], i) => <g key={time} className={close >= open ? "lgv-green" : "lgv-red"}>
        <line x1={x(i)} x2={x(i)} y1={y(high)} y2={y(low)} />
        <rect x={x(i) - 5.5} y={Math.min(y(open), y(close))} width="11" height={Math.max(Math.abs(y(open) - y(close)), 1.5)} rx="1.4" />
      </g>)}
      {["00:00", "06:00", "12:00", "18:00", "23:00"].map((hour, i) => <text key={hour} x={i * 148} y="222" className="lgv-axis">{hour}</text>)}
    </svg>
    <figcaption><span>Velas de 1 h · UTC</span><span><Clock3 size={13} aria-hidden="true" /> 17 nov 2026 · 00:00</span></figcaption>
  </figure>;
}

function Balance({ showLink = true }: { showLink?: boolean }) {
  return <section className="lgv-card lgv-balance" aria-labelledby="lgv-balance-title">
    <span className="lgv-icon lgv-icon--gold"><Wallet size={19} strokeWidth={1.6} aria-hidden="true" /></span>
    <h2 id="lgv-balance-title">Efectivo de práctica</h2>
    <p className="lgv-balance__value">348,83 <small>USD</small></p>
    <p className="lgv-muted">Saldo de una cuenta de muestra.</p>
    {showLink && <Link className="lgv-button" to="/wallet">Mi billetera <ArrowRight size={16} aria-hidden="true" /></Link>}
  </section>;
}

function QuickOperations() {
  return <section className="lgv-card lgv-ops" aria-labelledby="lgv-ops-title">
    <h2 id="lgv-ops-title">Operaciones</h2>
    <Link to="/wallet/deposit"><ArrowDownLeft size={17} aria-hidden="true" /> Depositar <ArrowRight size={14} aria-hidden="true" /></Link>
    <Link to="/wallet/withdraw"><ArrowUpRight size={17} aria-hidden="true" /> Retirar <ArrowRight size={14} aria-hidden="true" /></Link>
  </section>;
}

function TradingPreview() {
  return <>
    <div className="lgv-trade-grid">
      <section className="lgv-card lgv-market" aria-labelledby="lgv-market-title">
        <div className="lgv-market__top">
          <span className="lgv-icon lgv-icon--gold"><Bitcoin size={23} strokeWidth={1.75} aria-hidden="true" /></span>
          <div><h2 id="lgv-market-title">Bitcoin</h2><p>BTC / USD · Kraken</p></div>
          <span className="lgv-period">24 h</span>
        </div>
        <div className="lgv-price"><strong>{fmt.format(lastPrice)}</strong><span>USD</span><small>{change < 0 ? "−" : "+"}{fmt.format(Math.abs(change))} %</small></div>
        <Chart />
        <dl className="lgv-range"><div><dt>Mínimo 24 h</dt><dd>{fmt.format(range[0])} USD</dd></div><div><dt>Máximo 24 h</dt><dd>{fmt.format(range[1])} USD</dd></div></dl>
      </section>
      <div className="lgv-aux"><Balance /><QuickOperations /></div>
    </div>
    <div className="lgv-tip"><Command size={18} aria-hidden="true" /><p><strong>Encuentra una pestaña sin recorrer todo el menú.</strong> Pulsa <kbd>⌘ K</kbd> en Mac o <kbd>Ctrl K</kbd> en Windows.</p></div>
  </>;
}

const STAFF_LINKS = [
  { to: "/admin/users", name: "Usuarios", text: "Consulta el estado y el rol de las cuentas.", Icon: Users },
  { to: "/admin/audit", name: "Auditoría", text: "Revisa el registro de actividad del portal.", Icon: ScrollText },
  { to: "/admin/settings", name: "Configuración", text: "Consulta la configuración del sistema.", Icon: LockKeyhole },
];

function PreviewContent({ label, path }: { label: string; path: string }) {
  const admin = path === "/admin" || path.startsWith("/admin/");
  return <section className="lgv" aria-labelledby="lgv-title">
    <div className="lgv-intro">
      <div><p className="lgv-eyebrow"><span aria-hidden="true" /> {admin ? "Administración" : path === "/trading" ? "Mercados" : "Espacio personal"}</p>
        <h1 id="lgv-title">{label}</h1>
        <p>{admin ? "Accede a las herramientas asignadas a tu rol." : path === "/trading" ? "Consulta el mercado y explora tu espacio de inversión virtual." : "Explora la navegación principal de BANCA NEN."}</p></div>
      <span className="lgv-sample"><LockKeyhole size={14} aria-hidden="true" /> {path === "/trading" ? "Datos históricos de referencia" : "Vista de diseño · Sin acciones reales"}</span>
    </div>
    {path === "/trading" ? <TradingPreview /> : path === "/admin" ? (
      <div className="lgv-staff-grid">
        {STAFF_LINKS.map(({ to, name, text, Icon }) => <Link key={to} to={to} className="lgv-card lgv-staff-link">
          <span className="lgv-icon lgv-icon--gold"><Icon size={20} aria-hidden="true" /></span><h2>{name}</h2><p>{text}</p><span>Ir a la pestaña <ArrowRight size={15} aria-hidden="true" /></span>
        </Link>)}
      </div>
    ) : path === "/wallet" ? <div className="lgv-wallet-grid"><Balance showLink={false} /><QuickOperations /></div> : (
      <div className="lgv-card lgv-info"><p>Esta vista representa la pestaña <strong>{label}</strong>. La aplicación instalada conserva sus formularios, datos y controles actuales.</p>
        <Link to={admin ? "/admin" : "/trading"} className="lgv-button"><ArrowLeft size={16} aria-hidden="true" /> {admin ? "Panel de control" : "Volver a Trading"}</Link></div>
    )}
  </section>;
}

function Preview() {
  const [role, setRole] = useState<PreviewRole>("user");
  const [notice, setNotice] = useState("");
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const all = [...sidebarSections(role), ACCOUNT_SECTION].flatMap(({ items }) => items);
  const label = all.find((item) => sidebarCurrent(item, pathname))?.label ?? "BANCA NEN";
  function setPreviewRole(next: PreviewRole) {
    if (next === role) return;
    setRole(next);
    setNotice("");
    navigate(next === "admin" ? "/admin" : "/trading", { replace: true });
  }
  return <PortalFrame user={ACCOUNTS[role]} onLogout={async () => { setNotice("Es una vista de diseño. No hay una sesión real que cerrar."); }}
    renderHeader={(menu) => <header className="nen-portal__header lgv-header">
      <div className="nen-portal__context">{menu}<p className="lgv-preview-label"><span aria-hidden="true" /> Vista de diseño</p></div>
      <div className="lgv-role" role="group" aria-label="Perfil de vista previa">
        <UserRound size={15} aria-hidden="true" />
        <button type="button" aria-pressed={role === "user"} onClick={() => setPreviewRole("user")}>Usuario</button>
        <button type="button" aria-pressed={role === "admin"} onClick={() => setPreviewRole("admin")}>Admin</button>
      </div>
    </header>}>
    {notice && <p className="lgv-notice" role="status">{notice}</p>}
    <PreviewContent label={label} path={pathname} />
  </PortalFrame>;
}

createRoot(document.getElementById("root")!).render(<MemoryRouter initialEntries={["/trading"]}
  future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Preview /></MemoryRouter>);
