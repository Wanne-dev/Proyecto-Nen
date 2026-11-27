/* Helpers de respuesta HTTP — BANCA NEN */
import { Response } from "express";

export function ok(res: Response, data: unknown, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

export function fail(res: Response, message: string, status = 400): Response {
  return res.status(status).json({ success: false, message });
}
