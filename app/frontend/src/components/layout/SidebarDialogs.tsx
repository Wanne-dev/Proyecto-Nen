import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, LogOut, Search, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import GlassDialog from "./GlassDialog";
import { isLocalLink } from "./Sidebar";
import { findSidebarItems, sidebarIdentity, type SidebarAccount, type SidebarSection } from "./sidebarNavigation";

interface DialogProps {
  open: boolean;
  onDismiss: () => void;
}

export function SidebarSearch({ sections, open, onDismiss, onFollow }: DialogProps & {
  sections: readonly SidebarSection[];
  onFollow: () => void;
}) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const navigate = useNavigate();
  const results = useMemo(() => findSidebarItems(sections, query), [sections, query]);
  useEffect(() => { if (!open) setQuery(""); }, [open]);

  function step(event: KeyboardEvent) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const links = Array.from(list.current?.querySelectorAll("a") ?? []);
    const index = links.findIndex((link) => link === document.activeElement);
    if (!links.length || (index < 0 && event.target !== input.current)) return;
    event.preventDefault();
    const next = index + (event.key === "ArrowDown" ? 1 : -1);
    if (index === -1 && event.key === "ArrowUp") links[links.length - 1]?.focus();
    else if (next < 0 || next >= links.length) input.current?.focus();
    else links[next].focus();
  }

  return (
    <GlassDialog id="nen-search-dialog" className="nen-glass-panel nen-command" titleId="nen-search-title" open={open} onDismiss={onDismiss} initialFocus={input}>
      <div className="nen-glass-panel__head">
        <div><p className="nen-glass-panel__eyebrow">Navegación rápida</p><h2 id="nen-search-title">Buscar pestaña</h2></div>
        <button type="button" className="nen-modal__close" onClick={onDismiss} aria-label="Cerrar búsqueda"><X size={18} aria-hidden="true" /></button>
      </div>
      <div className="nen-command__body" onKeyDown={step}>
        <div role="search" className="nen-command__field">
          <Search size={19} aria-hidden="true" />
          <label className="sr-only" htmlFor="nen-search-input">Nombre de la pestaña</label>
          <input id="nen-search-input" ref={input} type="search" autoComplete="off" value={query} placeholder="Ej. billetera, seguridad…"
            onChange={(event) => setQuery(event.target.value)} aria-describedby="nen-search-hint"
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
              event.preventDefault();
              if (results[0]) { onFollow(); navigate(results[0].item.to); }
            }} />
        </div>
        <p className="sr-only" role="status">{results.length === 1 ? "1 pestaña disponible" : `${results.length} pestañas disponibles`}</p>
        {results.length === 0 && <p className="nen-command__empty">No encontramos esa pestaña. Prueba otro nombre.</p>}
        <ul className="nen-command__list" ref={list}>
          {results.map(({ item, group }) => (
            <li key={item.to}>
              <Link to={item.to} className="nen-command__result" onClick={(event) => { if (isLocalLink(event)) onFollow(); }}>
                <item.Icon size={19} strokeWidth={1.75} aria-hidden="true" />
                <span className="nen-command__name">{item.label}</span>
                <small>{group}</small>
                <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="nen-command__hint" id="nen-search-hint"><span><kbd>↑</kbd> <kbd>↓</kbd> Mover</span><span><kbd>↵</kbd> Abrir</span><span><kbd>Esc</kbd> Cerrar</span></div>
    </GlassDialog>
  );
}

export function SidebarSignOut({ user, open, onDismiss, onLogout }: DialogProps & {
  user: SidebarAccount | null;
  onLogout: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const cancel = useRef<HTMLButtonElement>(null);
  const { name, initials, status } = sidebarIdentity(user);
  useEffect(() => { if (!open) setError(""); }, [open]);

  async function confirm() {
    if (pending) return;
    setPending(true);
    setError("");
    try { await onLogout(); onDismiss(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Intenta de nuevo."); }
    finally { setPending(false); }
  }

  return (
    <GlassDialog id="nen-session-dialog" className="nen-glass-panel nen-session" titleId="nen-session-title"
      open={open} onDismiss={() => { if (!pending) onDismiss(); }} initialFocus={cancel}>
      <div className="nen-glass-panel__head">
        <div><p className="nen-glass-panel__eyebrow">Mi cuenta</p><h2 id="nen-session-title">¿Cerrar sesión?</h2></div>
        <button type="button" className="nen-modal__close" onClick={onDismiss} disabled={pending} aria-label="Cerrar confirmación"><X size={18} aria-hidden="true" /></button>
      </div>
      <div className="nen-session__identity">
        <span className="nen-rail__avatar" aria-hidden="true">{initials}</span><div><strong>{name}</strong><span>{status}</span></div>
      </div>
      {error && <p role="alert" className="nen-session__error">No se pudo cerrar la sesión. {error}</p>}
      <div className="nen-session__actions">
        <button type="button" ref={cancel} onClick={onDismiss} disabled={pending}>Volver</button>
        <button type="button" className="nen-session__confirm" onClick={() => void confirm()} disabled={pending}>
          <LogOut size={16} aria-hidden="true" /> {pending ? "Cerrando…" : "Cerrar sesión"}
        </button>
      </div>
    </GlassDialog>
  );
}
