/* Controladores de Notificaciones — BANCA NEN */
import { Request, Response, NextFunction } from "express";
import { listUserNotifications, markRead, markAllRead } from "../services/admin.service";

export async function listNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    res.json({ success: true, data: await listUserNotifications(userId) });
  } catch (err) { next(err); }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    res.json({ success: true, data: await markRead(userId, req.params.id) });
  } catch (err) { next(err); }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    res.json({ success: true, data: await markAllRead(userId) });
  } catch (err) { next(err); }
}
