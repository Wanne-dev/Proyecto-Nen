/* Controladores de Reportes — BANCA NEN */
import { Request, Response, NextFunction } from "express";
import { getPortfolio, getTransactionsReport } from "../services/report.service";

export async function getPortfolioReport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const range = (req.query.range as any) || "30d";
    res.json({ success: true, data: await getPortfolio(userId, range) });
  } catch (err) { next(err); }
}

export async function getTransactionsReport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    const range = (req.query.range as any) || "30d";
    res.json({ success: true, data: await getTransactionsReport(userId, range) });
  } catch (err) { next(err); }
}
