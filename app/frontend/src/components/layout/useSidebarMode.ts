import { useState, useSyncExternalStore } from "react";

const TABLET = "(min-width: 768px)";
const DESKTOP = "(min-width: 1024px)";
const STORAGE_KEY = "nen-sidebar-collapsed";

type Viewport = "mobile" | "tablet" | "desktop";

function viewport(): Viewport {
  if (!window.matchMedia || window.matchMedia(DESKTOP).matches) return "desktop";
  return window.matchMedia(TABLET).matches ? "tablet" : "mobile";
}

function subscribe(listener: () => void) {
  if (!window.matchMedia) return () => {};
  const queries = [window.matchMedia(TABLET), window.matchMedia(DESKTOP)];
  queries.forEach((query) => query.addEventListener("change", listener));
  return () => queries.forEach((query) => query.removeEventListener("change", listener));
}

function initialCollapse() {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; }
  catch { return false; }
}

export function useSidebarMode() {
  const screen = useSyncExternalStore(subscribe, viewport, () => "desktop" as const);
  const [desktopCollapsed, setDesktopCollapsed] = useState(initialCollapse);
  const [tabletCollapsed, setTabletCollapsed] = useState(true);
  const compact = screen === "tablet" ? tabletCollapsed : screen === "desktop" && desktopCollapsed;

  function toggle() {
    if (screen === "tablet") setTabletCollapsed(!tabletCollapsed);
    if (screen === "desktop") {
      const next = !desktopCollapsed;
      setDesktopCollapsed(next);
      try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); }
      catch { /* La preferencia funciona también sin almacenamiento. */ }
    }
  }

  return { screen, compact, toggle };
}
