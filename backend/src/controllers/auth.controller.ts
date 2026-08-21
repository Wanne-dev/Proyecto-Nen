import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { AppError } from "../middleware/errorHandler.middleware";
import { logAudit } from "../services/audit.service";
import { AuditAction } from "../models/AuditLog";

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.registerUser(req.body);
    logAudit({
      userId: result.user?.id || null,
      action: AuditAction.REGISTER,
      entityType: "user",
      entityId: result.user?.id,
      ipAddress: req.ip,
      details: "Registro de nueva cuenta: " + req.body.email,
    }).catch(() => {});
    res.status(201).json({ status: "success", data: result });
  } catch (error) { next(error); }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.loginUser(req.body);
    logAudit({
      userId: result.user?.id || null,
      action: AuditAction.LOGIN,
      entityType: "user",
      entityId: result.user?.id,
      ipAddress: req.ip,
      details: "Inicio de sesión exitoso: " + req.body.email,
    }).catch(() => {});
    res.status(200).json({ status: "success", data: result });
  } catch (error) { next(error); }
};

export const verifyEmailCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { throw new AppError("No autenticado", 401); }
    const { code } = req.body;
    if (!code) { throw new AppError("El codigo es requerido", 400); }
    const result = await authService.verifyEmailCode(userId, code);
    res.status(200).json({ status: "success", data: result });
  } catch (error) { next(error); }
};

export const verifyPhoneCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { throw new AppError("No autenticado", 401); }
    const { code } = req.body;
    if (!code) { throw new AppError("El codigo es requerido", 400); }
    const result = await authService.verifyPhoneCode(userId, code);
    res.status(200).json({ status: "success", data: result });
  } catch (error) { next(error); }
};

export const resendVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { throw new AppError("No autenticado", 401); }
    const result = await authService.resendVerificationCodes(userId);
    res.status(200).json({ status: "success", data: result });
  } catch (error) { next(error); }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) { throw new AppError("El email es requerido", 400); }
    const result = await authService.forgotPassword(email);
    res.status(200).json({ status: "success", data: result });
  } catch (error) { next(error); }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password } = req.body;
    if (!token || !password) { throw new AppError("Token y nueva contrasena son requeridos", 400); }
    const result = await authService.resetPassword(token, password);
    res.status(200).json({ status: "success", data: result });
  } catch (error) { next(error); }
};

export const enable2FA = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { throw new AppError("No autenticado", 401); }
    const result = await authService.enable2FA(userId);
    res.status(200).json({ status: "success", data: result });
  } catch (error) { next(error); }
};

export const disable2FA = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { throw new AppError("No autenticado", 401); }
    const result = await authService.disable2FA(userId);
    res.status(200).json({ status: "success", data: result });
  } catch (error) { next(error); }
};

export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { throw new AppError("No autenticado", 401); }
    const result = await authService.getProfile(userId);
    res.status(200).json({ status: "success", data: result });
  } catch (error) { next(error); }
};
