/* Controladores de Órdenes — BANCA NEN */
import { Request, Response, NextFunction } from "express";
import { createOrder as createOrderService, listOrders as listOrdersService, cancelOrder as cancelOrderService } from "../services/order.service";

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { symbol, type, side, quantity } = req.body;
    const result = await createOrderService(req.user!, { symbol, type, side, quantity }, { ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function listOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await listOrdersService(userId, page, limit);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function cancelOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await cancelOrderService(req.user!, req.params.id, { ipAddress: req.ip, userAgent: req.get("User-Agent") });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}
