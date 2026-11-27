import type { Request, Response } from "express";
import * as admin from "../services/admin.service";
import { getAuditIntegrity, listAudit } from "../services/audit.service";

const context = (req: Request) => ({ ipAddress: req.ip, userAgent: req.get("User-Agent") });
const success = (res: Response, data: unknown) => res.json({ success: true, data });
const pageParams = (req: Request) => ({ page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 50 });

export async function listUsers(req: Request, res: Response) {
  success(res, await admin.getUsers({ ...req.query as admin.UserFilters, ...pageParams(req) }));
}
export async function changeUserStatus(req: Request, res: Response) {
  success(res, await admin.changeUser(req.user!, req.params.id, { status: req.body.status }, context(req)));
}
export async function changeUserRole(req: Request, res: Response) {
  success(res, await admin.changeUser(req.user!, req.params.id, { role: req.body.role }, context(req)));
}
export async function listAuditLogs(req: Request, res: Response) {
  const { search, category, severity } = req.query as { search?: string; category?: string; severity?: string };
  const [logs, total] = await listAudit({ search, category, severity, ...pageParams(req) });
  success(res, { logs, total });
}
export async function auditIntegrity(_req: Request, res: Response) { success(res, await getAuditIntegrity()); }
export async function getStats(_req: Request, res: Response) { success(res, await admin.getStats()); }
export async function getChartData(req: Request, res: Response) { success(res, await admin.getChart(req.query.range as "7d" | "30d" | "90d" | undefined)); }
export async function getSettings(_req: Request, res: Response) { success(res, await admin.getSettings()); }
export async function saveSettings(req: Request, res: Response) {
  success(res, await admin.saveSettings(req.user!, req.body.allowRegistration, context(req)));
}
