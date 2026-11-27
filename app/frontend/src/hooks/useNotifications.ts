/* Hook: notificaciones — BANCA NEN */
import { useEffect } from "react";
import { useNotificationStore } from "../store/notification.slice";

export function useNotifications() {
  const notifications = useNotificationStore((s) => s.notifications);
  const unread = useNotificationStore((s) => s.unread);
  const loading = useNotificationStore((s) => s.loading);
  const load = useNotificationStore((s) => s.load);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { notifications, unread, loading, load, markRead, markAllRead };
}
