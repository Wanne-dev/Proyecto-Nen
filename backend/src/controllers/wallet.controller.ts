import { Request, Response, NextFunction } from "express";
import { getOrCreateWallet, getBalances, deposit, withdraw, getTransactions } from "../services/wallet.service";
import { logAudit } from "../services/audit.service";
import { AuditAction } from "../models/AuditLog";

export async function getWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const wallet = await getOrCreateWallet(userId);
    res.json({ success: true, data: wallet });
  } catch (err) { next(err); }
}

export async function getWalletBalances(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const balances = await getBalances(userId);
    res.json({ success: true, data: balances });
  } catch (err) { next(err); }
}

export async function createWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const wallet = await getOrCreateWallet(userId);
    res.json({ success: true, data: wallet });
  } catch (err) { next(err); }
}

export async function depositFunds(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const { currency, amount, description } = req.body;
    if (!currency || !amount || amount <= 0) return res.status(400).json({ success: false, message: "Currency y amount requeridos" });
    const result = await deposit(userId, currency, amount, description);
    logAudit({
      userId, action: AuditAction.DEPOSIT, entityType: "wallet", entityId: result.transaction?.id,
      ipAddress: req.ip, details: `Depósito ${amount} ${currency}`, newValues: { amount, currency },
    }).catch(() => {});
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function withdrawFunds(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const { currency, amount, description } = req.body;
    if (!currency || !amount || amount <= 0) return res.status(400).json({ success: false, message: "Currency y amount requeridos" });
    const result = await withdraw(userId, currency, amount, description);
    logAudit({
      userId, action: AuditAction.WITHDRAWAL, entityType: "wallet", entityId: result.transaction?.id,
      ipAddress: req.ip, details: `Retiro ${amount} ${currency}`, newValues: { amount, currency },
    }).catch(() => {});
    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err.message === "Saldo insuficiente") return res.status(400).json({ success: false, message: "Saldo insuficiente" });
    next(err);
  }
}

export async function listTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const transactions = await getTransactions(userId, page, limit);
    res.json({ success: true, data: transactions });
  } catch (err) { next(err); }
}