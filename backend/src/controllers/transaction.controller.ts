/* Controladores de Transacciones — BANCA NEN */
import { Request, Response, NextFunction } from "express";
import {
  listTransactions,
  getTransaction,
  getSummary,
} from "../services/transaction.service";

export async function listUserTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const { page, limit, type } = req.query as any;
    res.json({ success: true, data: await listTransactions(userId, { page, limit, type }) });
  } catch (err) { next(err); }
}

export async function getTransactionById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    res.json({ success: true, data: await getTransaction(userId, req.params.id) });
  } catch (err) { next(err); }
}

export async function getTransactionsSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const days = parseInt(req.query.days as string) || 30;
    res.json({ success: true, data: await getSummary(userId, days) });
  } catch (err) { next(err); }
}
