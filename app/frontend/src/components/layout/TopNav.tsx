import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { PORTAL_HOME } from "../../constants/navigation";
import BrandLogo from "../common/BrandLogo";
import { isLocalLink } from "./Sidebar";
import { ACCOUNT_SECTION, sidebarCurrent, sidebarIdentity, type SidebarAccount, type SidebarItem, type SidebarSection } from "./sidebarNavigation";
import "./topnav.css";

interface Props {
  sections: readonly SidebarSection[];
  user: SidebarAccount | null;
  onProfile: () => void;
  onFollow: () => void;
}

/** Navegación horizontal del portal: misma información y permisos que la barra anterior. */
export default function TopNav({ sections, user, onProfile, onFollow }: Props) {
  const { pathname } = useLocation();
  const nav = useRef<HTMLElement>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { name, initials, status } = sidebarIdentity(user);

  useEffect(() => {
    const active = sections.flatMap(({ items }) => items)
      .find((item) => item.children?.some((child) => sidebarCurrent(child, pathname)));
    setOpenMenu(active?.to ?? null);
  }, [pathname, sections]);

  useEffect(() => {
    if (!openMenu) return;
    const outside = (event: PointerEvent) => {
      if (!nav.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpenMenu(null); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [openMenu]);

  function link(item: SidebarItem, child = false, keepMenu?: string) {
    return (
      <Link to={item.to} className={`nen-topnav__link${child ? " nen-topnav__link--child" : ""}`}
        aria-label={item.label} aria-current={sidebarCurrent(item, pathname)}
        onClick={(event) => { if (isLocalLink(event)) { setOpenMenu(keepMenu ?? null); onFollow(); } }}>
        <item.Icon className="nen-topnav__glyph" aria-hidden="true" />
        <span className="nen-topnav__label">{item.label}</span>
      </Link>
    );
  }

  function renderItem(item: SidebarItem) {
    const children = item.children ?? [];
    if (!children.length) return <li key={item.to}>{link(item)}</li>;

    const id = `nen-topnav-menu-${item.to.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`;
    const open = openMenu === item.to;
    const activeChild = children.some((child) => sidebarCurrent(child, pathname));
    return (
      <li key={item.to} className="nen-topnav__group" data-open={open} data-active-child={activeChild}>
        <div className="nen-topnav__group-head">
          {link(item, false, item.to)}
          <button type="button" className="nen-topnav__chevron" aria-label={`Mostrar opciones de ${item.label}`}
            aria-expanded={open} aria-controls={id} onClick={() => setOpenMenu(open ? null : item.to)}>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        </div>
        <ul id={id} className="nen-topnav__submenu" aria-label={`Opciones de ${item.label}`} hidden={!open}>
          {children.map((child) => <li key={child.to}>{link(child, true)}</li>)}
        </ul>
      </li>
    );
  }

  return (
    <div className="nen-topnav">
      <Link to={PORTAL_HOME} className="nen-topnav__brand" aria-label="BANCA NEN · Inicio"
        onClick={() => { setOpenMenu(null); onFollow(); }}>
        <BrandLogo className="nen-topnav__logo" />
      </Link>

      <nav ref={nav} id="nen-topnav-links" className="nen-topnav__scroll" aria-label="Navegación principal">
        <ul className="nen-topnav__list">{sections.flatMap(({ items }) => items.map(renderItem))}</ul>
      </nav>

      <div className="nen-topnav__account">
        <nav aria-label="Cuenta y seguridad"><ul className="nen-topnav__list">{ACCOUNT_SECTION.items.map((item) => <li key={item.to}>{link(item)}</li>)}</ul></nav>
        <button type="button" className="nen-topnav__profile" aria-haspopup="dialog"
          aria-label={`${name} · Cerrar sesión`} title={`${name} · Cerrar sesión`} onClick={onProfile}>
          <span className="nen-topnav__avatar" data-initials={initials} aria-hidden="true" />
          <span className="nen-topnav__identity">
            <strong className="nen-topnav__name">{name}</strong><span className="nen-topnav__role">{status}</span>
          </span>
          <span className="nen-topnav__exit" aria-hidden="true"><LogOut size={16} /></span>
        </button>
      </div>
    </div>
  );
}
