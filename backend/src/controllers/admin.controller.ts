/* Controladores de Administración — BANCA NEN */
import { Request, Response, NextFunction } from "express";
import { getUsers, changeStatus, changeRole, getAudit, getStats, getChart, getSettings, saveSettings } from "../services/admin.service";

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, role, status, page, limit } = req.query as any;
    const users = await getUsers({ search, role, status, page: parseInt(page) || 1, limit: parseInt(limit) || 50 });
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
}

export async function changeUserStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const adminId = (req as any).user.id;
    const user = await changeStatus(adminId, req.params.id, req.body.status);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

export async function changeUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const adminId = (req as any).user.id;
    const user = await changeRole(adminId, req.params.id, req.body.role);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

export async function listAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { search, category, severity, page, limit } = req.query as any;
    const [logs, total] = await getAudit({ search, category, severity, page: parseInt(page) || 1, limit: parseInt(limit) || 50 });
    res.json({ success: true, data: { logs, total } });
  } catch (err) { next(err); }
}

export async function getStats(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await getStats() });
  } catch (err) { next(err); }
}

export async function getChartData(req: Request, res: Response, next: NextFunction) {
  try {
    const range = (req.query.range as any) || "30d";
    res.json({ success: true, data: await getChart(range) });
  } catch (err) { next(err); }
}

export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ success: true, data: await getSettings() });
  } catch (err) { next(err); }
}

export async function saveSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const adminId = (req as any).user.id;
    res.json({ success: true, data: await saveSettings(adminId, req.body) });
  } catch (err) { next(err); }
}
