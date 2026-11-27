import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import PortalFrame from "./PortalFrame";
import { ACCOUNT_SECTION, findSidebarItems, sidebarFlatItems, sidebarSections, type SidebarAccount } from "./sidebarNavigation";
import type { UserRole } from "../../types/User.types";

const USER: SidebarAccount = { firstName: "Valentina", lastName: "Torres", role: "user", isVerified: true };
const STAFF_DESTINATIONS = ["/admin", "/admin/users", "/admin/audit", "/admin/reports", "/admin/settings"];
const linksFor = (role: UserRole) => sidebarFlatItems(sidebarSections(role)).map(({ to }) => to);

function RouteLabel() {
  const { pathname } = useLocation();
  return <h1>{pathname}</h1>;
}

function mount(path = "/asistente", user = USER, logout = vi.fn().mockResolvedValue(undefined)) {
  return {
    logout,
    ...render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PortalFrame user={user} onLogout={logout} renderHeader={(trigger) => <header>{trigger}</header>}><RouteLabel /></PortalFrame>
    </MemoryRouter>),
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
  // jsdom no implementa la capa modal nativa; el foco y backdrop reales se prueban en Chromium.
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } },
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Barra de navegación BANCA NEN", () => {
  it("conserva únicamente las pestañas personales reales para un usuario", () => {
    expect(linksFor("user")).toEqual(["/asistente", "/wallet", "/trading/history", "/wallet/deposit", "/wallet/withdraw", "/trading", "/reports", "/trading/prediction"]);
    expect(ACCOUNT_SECTION.items.map(({ to }) => to)).toEqual(["/settings", "/settings/security"]);
    mount();
    const nav = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(within(nav).queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Start IA" })).toHaveAttribute("aria-current", "page");
  });

  it("muestra el logo oficial en la barra y lo enlaza con el inicio", () => {
    mount();
    const brand = screen.getByRole("link", { name: "BANCA NEN · Inicio" });
    expect(brand).toHaveAttribute("href", "/asistente");
    const logo = within(brand).getByRole("img", { name: "BANCA NEN" });
    expect(logo.getAttribute("src")).toMatch(/banca-nen-white\.png/);
  });

  it("usa la matriz de permisos existente y no duplica las rutas del panel", () => {
    expect(linksFor("admin").filter((path) => path.startsWith("/admin"))).toEqual(STAFF_DESTINATIONS);
    expect(linksFor("analyst").slice(-2)).toEqual(["/admin", "/admin/reports"]);
    expect(linksFor("operator").slice(-3)).toEqual(["/admin", "/admin/users", "/admin/reports"]);
    expect(linksFor("compliance").slice(-3)).toEqual(["/admin", "/admin/audit", "/admin/reports"]);
    mount("/admin/audit", { ...USER, role: "admin" });
    const nav = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(within(nav).getAllByRole("link", { current: "page" })).toEqual([within(nav).getByRole("link", { name: "Auditoría" })]);
    expect(within(nav).getByRole("link", { name: "Start IA" })).toBeInTheDocument();
  });

  it("marca Seguridad como sección actual durante el alta de 2FA, no Ajustes", () => {
    mount("/2fa-setup");
    expect(screen.getByRole("link", { name: "Seguridad" })).toHaveAttribute("aria-current", "location");
    expect(screen.getByRole("link", { name: "Ajustes" })).not.toHaveAttribute("aria-current");
  });

  it("guarda las pestañas hijas dentro de su pestaña principal, sin búsqueda ni colapso", () => {
    mount();
    const nav = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(screen.queryByRole("button", { name: /Colapsar navegación|Expandir navegación/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Buscar pestaña/ })).not.toBeInTheDocument();
    expect(within(nav).queryByText("General")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Operaciones & gestión")).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Historial de órdenes" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Mis reportes" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mostrar opciones de Mi billetera" }));
    expect(within(nav).getByRole("link", { name: "Historial de órdenes" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Depositar" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Retirar" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mostrar opciones de Trading" }));
    expect(within(nav).getByRole("link", { name: "Mis reportes" })).toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Historial de órdenes" })).not.toBeInTheDocument();
  });

  it("navega a las rutas reales de las pestañas hijas", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar opciones de Mi billetera" }));
    fireEvent.click(screen.getByRole("link", { name: "Historial de órdenes" }));
    expect(await screen.findByRole("heading", { name: "/trading/history" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mostrar opciones de Trading" }));
    fireEvent.click(screen.getByRole("link", { name: "Mis reportes" }));
    expect(await screen.findByRole("heading", { name: "/reports" })).toBeInTheDocument();
  });

  it("usa el vídeo de fondo a página completa solo en Start IA", () => {
    const assistant = mount();
    expect(assistant.container.querySelector(".nen-portal")).toHaveAttribute("data-assistant", "true");
    expect(assistant.container.querySelector(".nen-portal__ambient video")).toHaveAttribute("src", "/assets/videos/assistant-bg.mp4");
  });

  it("ralentiza el fondo y lo pausa mientras se escribe en Start IA", () => {
    mount();
    const video = document.querySelector(".nen-portal__ambient video") as HTMLVideoElement;
    expect(video.playbackRate).toBe(.5);

    const editor = document.createElement("textarea");
    document.body.appendChild(editor);
    editor.focus();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    editor.blur();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    editor.remove();
  });

  it("no activa el fondo de vídeo en las demás páginas", () => {
    const wallet = mount("/wallet");
    expect(wallet.container.querySelector(".nen-portal")).toHaveAttribute("data-assistant", "false");
    expect(wallet.container.querySelector(".nen-portal__ambient")).not.toBeInTheDocument();
  });

  it("busca con o sin tildes y navega con Enter sin depender de enviar un formulario", async () => {
    const sections = sidebarSections("user");
    expect(findSidebarItems(sections, "AUdiTORÍA")).toEqual([]);
    expect(findSidebarItems(sections, " dashboard ").map(({ item }) => item.to)).toEqual(["/asistente"]);
    mount();
    fireEvent.keyDown(window, { ctrlKey: true, key: "k" });
    const dialog = screen.getByRole("dialog", { name: "Buscar pestaña" });
    const input = within(dialog).getByRole("searchbox");
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "analisis" } });
    expect(within(dialog).getAllByRole("link")).toHaveLength(1);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(await screen.findByRole("heading", { name: "/trading/prediction" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Buscar pestaña" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Trading" })).not.toHaveAttribute("aria-current");
  });

  it("confirma el cierre de sesión y permite reintentar si el servicio falla", async () => {
    const logout = vi.fn().mockRejectedValueOnce(new Error("Servicio no disponible")).mockResolvedValueOnce(undefined);
    mount("/asistente", USER, logout);
    fireEvent.click(screen.getByRole("button", { name: /Valentina Torres.*Cerrar sesión/ }));
    const dialog = screen.getByRole("dialog", { name: "¿Cerrar sesión?" });
    expect(within(dialog).getByRole("button", { name: "Volver" })).toHaveFocus();
    expect(logout).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar sesión" })); });
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Servicio no disponible");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "¿Cerrar sesión?" })).not.toBeInTheDocument());
    expect(logout).toHaveBeenCalledTimes(2);
  });
});
