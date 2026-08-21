/* Controladores de Órdenes — BANCA NEN */
import { Request, Response, NextFunction } from "express";
import { createOrder, listOrders, cancelOrder } from "../services/order.service";

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const result = await createOrder(userId, { ...req.body, ip: req.ip });
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function listOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await listOrders(userId, page, limit);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function cancelOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const result = await cancelOrder(userId, req.params.id, req.ip);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}
