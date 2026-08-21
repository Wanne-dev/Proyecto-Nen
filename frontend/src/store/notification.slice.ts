/* ============================================================
   STORE DE NOTIFICACIONES — BANCA NEN (API real)
   ============================================================ */
import { create } from "zustand";
import { notificationService, type Notification } from "../services/notifications";

interface NotificationState {
  notifications: Notification[];
  loading: boolean;
  unread: number;
  load: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  loading: false,
  unread: 0,

  load: async () => {
    set({ loading: true });
    try {
      const notifications = await notificationService.list();
      set({ notifications, unread: notifications.filter((n) => !n.read).length, loading: false });
    } catch (e: any) {
      console.error("Notifications error:", e?.message);
      set({ loading: false });
    }
  },

  markRead: async (id: string) => {
    await notificationService.markRead(id);
    set({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) });
    set({ unread: get().notifications.filter((n) => !n.read).length });
  },

  markAllRead: async () => {
    await notificationService.markAllRead();
    set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) });
    set({ unread: 0 });
  },

  reset: () => set({ notifications: [], unread: 0 }),
}));
