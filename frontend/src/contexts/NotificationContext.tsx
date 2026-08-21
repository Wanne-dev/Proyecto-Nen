/* Contexto de notificaciones — BANCA NEN (wrapper sobre el store) */
import { createContext, useContext, type ReactNode } from "react";
import { useNotifications } from "../hooks/useNotifications";

interface NotifContextValue {
  unread: number;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotifContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { unread, markAllRead } = useNotifications();
  return <NotificationContext.Provider value={{ unread, markAllRead }}>{children}</NotificationContext.Provider>;
}

export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificationContext debe usarse dentro de <NotificationProvider>");
  return ctx;
}
