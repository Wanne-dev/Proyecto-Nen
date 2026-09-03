/* Controladores de Usuario — BANCA NEN */
import { Request, Response, NextFunction } from "express";
import {
  getProfile,
  updateProfile,
  getSettings,
  updateSettings,
} from "../services/user.service";

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    res.json({ success: true, data: await getProfile(userId) });
  } catch (err) { next(err); }
}

export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    res.json({ success: true, data: await updateProfile(userId, req.body) });
  } catch (err) { next(err); }
}

export async function getMySettings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    res.json({ success: true, data: await getSettings(userId) });
  } catch (err) { next(err); }
}

export async function updateMySettings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user.id;
    res.json({ success: true, data: await updateSettings(userId, req.body) });
  } catch (err) { next(err); }
}
