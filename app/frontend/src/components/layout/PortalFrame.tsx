import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { PORTAL_HOME } from "../../constants/navigation";
import { SidebarSearch, SidebarSignOut } from "./SidebarDialogs";
import { ACCOUNT_SECTION, sidebarSections, type SidebarAccount } from "./sidebarNavigation";
import TopNav from "./TopNav";
import "./portal.css";
import "./sidebar.css";

interface Props {
  user: SidebarAccount | null;
  onLogout: () => Promise<void>;
  renderHeader: (mobileNavigation: ReactNode) => ReactNode;
  children: ReactNode;
}

/** Marco compartido. No decide autenticación ni permisos de ruta. */
export default function PortalFrame({ user, onLogout, renderHeader, children }: Props) {
  const { pathname } = useLocation();
  const assistantPage = pathname.replace(/\/+$/, "").toLowerCase() === PORTAL_HOME;
  const [popup, setPopup] = useState<"search" | "signout" | null>(null);
  const main = useRef<HTMLElement>(null);
  const ambient = useRef<HTMLVideoElement>(null);
  const previousPath = useRef(pathname);
  const role = user?.role;
  const sections = useMemo(() => sidebarSections(role), [role]);
  const searchable = useMemo(() => [...sections, ACCOUNT_SECTION], [sections]);

  useLayoutEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    setPopup(null);
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      main.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.shiftKey ||
          (!event.metaKey && !event.ctrlKey) || event.key.toLowerCase() !== "k" || popup === "signout") return;
      event.preventDefault();
      setPopup((current) => current === "search" ? null : "search");
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [popup]);

  // Fondo sobrio: va despacio y se detiene mientras se escribe para no distraer.
  useEffect(() => {
    const video = ambient.current;
    if (!video) return;
    const isEditor = (target: EventTarget | null) => target instanceof HTMLElement && Boolean(target.closest("textarea, input, [contenteditable='true']"));
    try { video.playbackRate = .5; } catch { /* El navegador puede ignorar la velocidad. */ }
    const pause = () => { try { video.pause(); } catch { /* jsdom o el navegador pueden rechazarlo. */ } };
    const resume = () => {
      try {
        const played = video.play();
        if (played && typeof played.catch === "function") played.catch(() => {});
      } catch { /* Sin sonido ni bloqueo: el fondo puede quedarse quieto. */ }
    };
    const focusIn = (event: FocusEvent) => { if (isEditor(event.target)) pause(); };
    const focusOut = (event: FocusEvent) => { if (isEditor(event.target) && !isEditor(event.relatedTarget)) resume(); };
    document.addEventListener("focusin", focusIn);
    document.addEventListener("focusout", focusOut);
    return () => {
      document.removeEventListener("focusin", focusIn);
      document.removeEventListener("focusout", focusOut);
    };
  }, [assistantPage]);

  // Elegir la pestaña actual también cierra la búsqueda rápida.
  const closeForLink = () => setPopup(null);

  return (
    <div className="nen-portal" data-nav-mode="expanded" data-assistant={assistantPage}>
      {assistantPage && (
        <div className="nen-portal__ambient" aria-hidden="true">
          <video ref={ambient} src="/assets/videos/assistant-bg.mp4" autoPlay muted loop playsInline preload="metadata" />
        </div>
      )}
      <a className="nen-portal__skip" href="#nen-main" onClick={(event) => { event.preventDefault(); main.current?.focus(); }}>Saltar al contenido</a>
      <div className="nen-portal__top">
        <TopNav sections={sections} user={user} onProfile={() => setPopup("signout")} onFollow={closeForLink} />
        {renderHeader(null)}
      </div>
      <main id="nen-main" ref={main} tabIndex={-1} className="nen-portal__main" data-start={pathname === PORTAL_HOME}>
        <div className="nen-portal__content">{children}</div>
      </main>
      <SidebarSearch sections={searchable} open={popup === "search"} onDismiss={() => setPopup(null)} onFollow={closeForLink} />
      <SidebarSignOut user={user} open={popup === "signout"} onDismiss={() => setPopup(null)} onLogout={onLogout} />
    </div>
  );
}
