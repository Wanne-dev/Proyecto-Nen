/* ============================================================
   BANCA NEN — Servicio de Notificaciones
   ============================================================ */
import { AppDataSource } from "../config/database";
import { Notification, NotificationType } from "../models/Notification";
import { AppError } from "../middleware/errorHandler.middleware";

const repo = () => AppDataSource.getRepository(Notification);

function toType(type: string): NotificationType {
  const values = Object.values(NotificationType) as string[];
  return values.includes(type) ? (type as NotificationType) : NotificationType.SYSTEM;
}

export async function listUserNotifications(userId: string, limit = 30) {
  return repo().find({ where: { userId } as any, order: { createdAt: "DESC" }, take: limit });
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  priority = "normal",
  actionUrl?: string
) {
  return repo().save(
    repo().create({
      userId,
      type: toType(type),
      title,
      message,
      priority,
      actionUrl: actionUrl || null,
      read: false,
    })
  );
}

export async function markRead(userId: string, id: string) {
  const n = await repo().findOne({ where: { id, userId } as any });
  if (!n) throw new AppError("Notificacion no encontrada", 404);
  n.read = true;
  n.readAt = new Date();
  return repo().save(n);
}

export async function markAllRead(userId: string) {
  await repo().update({ userId } as any, { read: true, readAt: new Date() } as any);
  return { success: true };
}

export async function unreadCount(userId: string) {
  return repo().count({ where: { userId, read: false } as any });
}
