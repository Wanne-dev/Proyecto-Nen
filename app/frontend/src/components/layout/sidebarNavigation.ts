import {
  BrainCircuit, CandlestickChart, CircleMinus, CirclePlus, FileBarChart, History,
  LayoutDashboard, ScrollText, ServerCog, Settings, Shield, Sparkles, Users, Wallet,
  type LucideIcon,
} from "lucide-react";
import { matchPath } from "react-router-dom";
import { PORTAL_HOME, PORTAL_TITLE } from "../../constants/navigation";
import { canAccessStaffSection, type StaffSection, type User, type UserRole } from "../../types/User.types";

export type SidebarAccount = Pick<User, "firstName" | "lastName" | "role" | "isVerified">;

export interface SidebarItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  keywords?: string;
  aliases?: readonly string[];
  children?: readonly SidebarItem[];
}

export interface SidebarSection {
  id: string;
  label: string;
  items: readonly SidebarItem[];
}

const PERSONAL: readonly SidebarSection[] = [
  { id: "general", label: "General", items: [
    { to: PORTAL_HOME, label: PORTAL_TITLE, Icon: Sparkles, keywords: "inicio resumen dashboard asistente ia start" },
    { to: "/wallet", label: "Mi billetera", Icon: Wallet, keywords: "saldos saldo activos", children: [
      { to: "/trading/history", label: "Historial de órdenes", Icon: History, keywords: "transacciones movimientos historial" },
      { to: "/wallet/deposit", label: "Depositar", Icon: CirclePlus, keywords: "depósito recarga" },
      { to: "/wallet/withdraw", label: "Retirar", Icon: CircleMinus, keywords: "retiro" },
    ] },
    { to: "/trading", label: "Trading", Icon: CandlestickChart, keywords: "mercados compra venta", children: [
      { to: "/reports", label: "Mis reportes", Icon: FileBarChart, keywords: "informes exportar" },
    ] },
  ] },
  { id: "operations", label: "Operaciones & gestión", items: [
    { to: "/trading/prediction", label: "Noticias", Icon: BrainCircuit, keywords: "noticias mercado predicción análisis estimaciones" },
  ] },
];

const STAFF: readonly (SidebarItem & { section: StaffSection })[] = [
  { to: "/admin", label: "Panel de control", Icon: LayoutDashboard, section: "overview", keywords: "panel admin administración" },
  { to: "/admin/users", label: "Usuarios", Icon: Users, section: "users", keywords: "gestión cuentas admin" },
  { to: "/admin/audit", label: "Auditoría", Icon: ScrollText, section: "audit", keywords: "eventos registro admin" },
  { to: "/admin/reports", label: "Reportes admin", Icon: FileBarChart, section: "overview", keywords: "reportes administrativos informes admin" },
  { to: "/admin/settings", label: "Configuración", Icon: ServerCog, section: "settings", keywords: "configuración sistema admin" },
];

export const ACCOUNT_SECTION: SidebarSection = { id: "account", label: "Cuenta", items: [
  { to: "/settings", label: "Ajustes", Icon: Settings, keywords: "perfil configuración personal" },
  { to: "/settings/security", label: "Seguridad", Icon: Shield, keywords: "sesiones 2fa autenticador contraseña", aliases: ["/2fa-setup"] },
] };

export function sidebarSections(role?: UserRole): readonly SidebarSection[] {
  const allowed = STAFF.filter(({ section }) => canAccessStaffSection(role, section));
  return allowed.length ? [...PERSONAL, { id: "staff", label: "Administración", items: allowed }] : PERSONAL;
}

export function sidebarCurrent(item: SidebarItem, pathname: string): "page" | "location" | undefined {
  if (matchPath({ path: item.to, end: true }, pathname)) return "page";
  if (item.aliases?.some((path) => matchPath({ path, end: true }, pathname))) return "location";
}

/** Incluye las pestañas hijas sin perder la pestaña principal a la que pertenecen. */
export function sidebarFlatItems(sections: readonly SidebarSection[]): readonly SidebarItem[] {
  return sections.flatMap(({ items }) => items.flatMap((item) => [item, ...(item.children ?? [])]));
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function findSidebarItems(sections: readonly SidebarSection[], query: string) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return sections.flatMap(({ label: group, items }) => items.flatMap((item) => [
    { item, group },
    ...(item.children ?? []).map((child) => ({ item: child, group: `${item.label} · ${group}` })),
  ])).filter(({ item, group }) => {
    const searchable = normalize(`${item.label} ${group} ${item.keywords ?? ""}`);
    return words.every((word) => searchable.includes(word));
  });
}

export function sidebarIdentity(user: SidebarAccount | null) {
  const names = [user?.firstName.trim(), user?.lastName.trim()].filter((name): name is string => Boolean(name));
  const name = names.join(" ") || "Mi cuenta";
  const initials = names.map((part) => Array.from(part)[0]).join("").toLocaleUpperCase("es-CO") || "N";
  const roles: Partial<Record<UserRole, string>> = {
    admin: "Administrador", operator: "Operador", analyst: "Analista", compliance: "Cumplimiento",
  };
  const role = user?.role ? roles[user.role] : undefined;
  return { name, initials, status: role ?? (user?.isVerified ? "Contacto verificado" : "Cuenta personal") };
}
