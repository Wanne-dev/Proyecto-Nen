/* ============================================================
   SERVICIO DE NOTIFICACIONES — BANCA NEN (API real)
   ============================================================ */
import api, { unwrap } from "../api/client";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  priority?: string;
}

export const notificationService = {
  async list(): Promise<Notification[]> {
    const res = await api.get("/notifications");
    return unwrap<Notification[]>(res.data) || [];
  },

  async markRead(id: string): Promise<any> {
    const res = await api.post(`/notifications/${id}/read`);
    return unwrap<any>(res.data);
  },

  async markAllRead(): Promise<any> {
    const res = await api.post("/notifications/read-all");
    return unwrap<any>(res.data);
  },
};
