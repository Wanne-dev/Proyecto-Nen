import { useCallback, useLayoutEffect, useEffect, useRef, useState, type MouseEvent } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";
import { ACCOUNT_SECTION, sidebarCurrent, sidebarIdentity, type SidebarAccount, type SidebarItem, type SidebarSection } from "./sidebarNavigation";

interface Props {
  sections: readonly SidebarSection[];
  user: SidebarAccount | null;
  compact: boolean;
  drawer: boolean;
  visible: boolean;
  overlayOpen: boolean;
  shortcut: string;
  onToggle: () => void;
  onClose: () => void;
  onSearch: () => void;
  onProfile: () => void;
  onFollow: () => void;
}

export function isLocalLink(event: MouseEvent) {
  return event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.defaultPrevented;
}

export default function Sidebar({ sections, user, compact, drawer, visible, overlayOpen, shortcut, onToggle, onClose, onSearch, onProfile, onFollow }: Props) {
  const { pathname } = useLocation();
  const rail = useRef<HTMLElement>(null);
  const scroll = useRef<HTMLElement>(null);
  const timer = useRef<number>();
  const [tip, setTip] = useState<{ text: string; y: number; anchor: HTMLElement } | null>(null);
  const { name, initials, status } = sidebarIdentity(user);

  const stopTimer = useCallback(() => window.clearTimeout(timer.current), []);
  const hideTip = useCallback(() => {
    stopTimer();
    setTip(null);
  }, [stopTimer]);

  useLayoutEffect(() => {
    hideTip();
    const node = scroll.current;
    const selected = node?.querySelector<HTMLElement>("[aria-current]");
    if (!node || !selected || !visible) return;
    const { top, bottom } = node.getBoundingClientRect();
    const staffGroup = selected.closest("#nen-rail-staff")?.getBoundingClientRect();
    const item = staffGroup && staffGroup.height <= bottom - top - 6 ? staffGroup : selected.getBoundingClientRect();
    if (item.top < top + 3) node.scrollTop += item.top - top - 3;
    else if (item.bottom > bottom - 3) node.scrollTop += item.bottom - bottom + 3;
  }, [pathname, compact, sections, visible, hideTip]);

  useEffect(() => {
    if (!tip || !compact || overlayOpen) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") hideTip(); };
    window.addEventListener("keydown", escape);
    window.addEventListener("resize", hideTip);
    return () => {
      window.removeEventListener("keydown", escape);
      window.removeEventListener("resize", hideTip);
    };
  }, [tip, compact, overlayOpen, hideTip]);
  useEffect(() => stopTimer, [stopTimer]);

  function revealTip(anchor: HTMLElement, text: string) {
    if (!compact || overlayOpen || !rail.current) return;
    stopTimer();
    const box = anchor.getBoundingClientRect();
    setTip({ text, anchor, y: box.top + box.height / 2 - rail.current.getBoundingClientRect().top - rail.current.clientTop });
  }

  function queueHide(anchor: HTMLElement) {
    stopTimer();
    timer.current = window.setTimeout(() => {
      if (!anchor.matches(":focus-visible")) setTip(null);
    }, 150);
  }

  function hint(text: string) {
    return {
      onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
        if (event.pointerType !== "touch") revealTip(event.currentTarget, text);
      },
      onPointerLeave: (event: React.PointerEvent<HTMLElement>) => queueHide(event.currentTarget),
      onFocus: (event: React.FocusEvent<HTMLElement>) => {
        if (event.currentTarget.matches(":focus-visible")) revealTip(event.currentTarget, text);
      },
      onBlur: hideTip,
    };
  }

  function link(item: SidebarItem) {
    return (
      <li key={item.to}>
        <Link to={item.to} className="nen-rail__link" aria-current={sidebarCurrent(item, pathname)}
          onClick={(event) => { if (isLocalLink(event)) { hideTip(); onFollow(); } }} {...hint(item.label)}>
          <item.Icon className="nen-rail__glyph" aria-hidden="true" />
          <span className="nen-rail__label nen-rail__reveal">{item.label}</span>
        </Link>
      </li>
    );
  }

  const controlLabel = drawer ? "Cerrar navegación" : compact ? "Expandir navegación" : "Colapsar navegación";

  return (
    <aside ref={rail} className="nen-rail" aria-label="Barra lateral de BANCA NEN" data-compact={compact} data-drawer={drawer}>
      <div className="nen-rail__header">
        <div className="nen-rail__brand nen-rail__reveal" aria-hidden={compact || undefined}>
          <BrandLogo className="nen-rail__logo" />
        </div>
        <button type="button" className="nen-rail__toggle" aria-label={controlLabel}
          aria-expanded={drawer ? undefined : !compact} aria-controls={drawer ? undefined : "nen-rail-links"}
          onClick={() => { hideTip(); if (drawer) onClose(); else onToggle(); }}
          {...hint(controlLabel)}>
          {drawer ? <X size={16} aria-hidden="true" /> : compact ? <PanelLeftOpen size={16} aria-hidden="true" /> : <PanelLeftClose size={16} aria-hidden="true" />}
        </button>
      </div>

      <button type="button" className="nen-rail__search" aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K"
        onClick={() => { hideTip(); onSearch(); }} {...hint(`Buscar pestaña · ${shortcut}`)}>
        <Search className="nen-rail__glyph" aria-hidden="true" />
        <span className="nen-rail__search-label nen-rail__reveal">Buscar pestaña</span>
        <kbd className="nen-rail__keys nen-rail__reveal" aria-hidden="true">{shortcut}</kbd>
      </button>

      <nav ref={scroll} id="nen-rail-links" className="nen-rail__scroll" aria-label="Navegación principal" onScroll={hideTip}>
        {sections.map(({ id, label, items }) => (
          <section className="nen-rail__group" key={id} id={`nen-rail-${id}`} aria-labelledby={`nen-nav-${id}`}>
            <h2 id={`nen-nav-${id}`} className="nen-rail__heading"><span className="nen-rail__reveal">{label}</span></h2>
            <ul className="nen-rail__list">{items.map(link)}</ul>
          </section>
        ))}
      </nav>

      <div className="nen-rail__footer">
        <nav aria-label="Cuenta y seguridad"><ul className="nen-rail__list">{ACCOUNT_SECTION.items.map(link)}</ul></nav>
        <button type="button" className="nen-rail__profile" aria-haspopup="dialog"
          onClick={() => { hideTip(); onProfile(); }} {...hint(`${name} · Cerrar sesión`)}>
          <span className="nen-rail__avatar nen-rail__avatar--badge" data-initials={initials} aria-hidden="true" />
          <span className="nen-rail__identity nen-rail__reveal">
            <strong className="nen-rail__name">{name}</strong><span className="nen-rail__role">{status}</span>
          </span>
          <span className="sr-only">Cerrar sesión</span>
          <span className="nen-rail__exit nen-rail__reveal" aria-hidden="true"><LogOut size={16} /></span>
        </button>
      </div>

      {compact && tip && !overlayOpen && <span className="nen-rail__tooltip" aria-hidden="true" style={{ top: tip.y }}
        onPointerEnter={stopTimer} onPointerLeave={() => queueHide(tip.anchor)}>{tip.text}</span>}
    </aside>
  );
}
