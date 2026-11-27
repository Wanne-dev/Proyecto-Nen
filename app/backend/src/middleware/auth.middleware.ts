import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { AppError } from "./errorHandler.middleware";
import { AccountStatus, UserRole } from "../models/User";
import { UserSession, type SessionScope } from "../models/UserSession";
import { verifyAccessToken } from "../utils/jwt";

export const ACCESS_COOKIE = "nen_access";
export const REFRESH_COOKIE = "nen_refresh";

export function readAuthCookie(req: Request, name: string): string | undefined {
  const prefix = `${name}=`;
  const matches = (req.headers.cookie || "").split(";").map((item) => item.trim()).filter((item) => item.startsWith(prefix));
  return matches.length === 1 ? matches[0].slice(prefix.length) : undefined;
}

export interface AuthPayload {
  id: string;
  sessionId: string;
  scope: SessionScope;
  role: UserRole;
  mfaVerified: boolean;
}

declare global { namespace Express { interface Request { user?: AuthPayload } } }

export const authenticateSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const token = readAuthCookie(req, ACCESS_COOKIE);
  if (!token) { next(new AppError("Inicia sesión para continuar", 401)); return; }
  let claims: ReturnType<typeof verifyAccessToken>;
  try { claims = verifyAccessToken(token); }
  catch { next(new AppError("Sesión vencida o no disponible", 401)); return; }
  try {
    const session = await AppDataSource.getRepository(UserSession).createQueryBuilder("s")
      .innerJoin("s.user", "u").addSelect(["u.id", "u.role", "u.accountStatus", "u.isVerified", "u.twoFactorEnabled"])
      .where("s.id = :id AND s.userId = :userId AND s.isActive AND s.expiresAt > CURRENT_TIMESTAMP", { id: claims.sessionId, userId: claims.userId })
      .getOne();
    if (!session || session.scope !== claims.scope || (session.scope === "access") !== session.user.isVerified ||
      (session.user.twoFactorEnabled && !session.mfaVerified)) throw new AppError("Sesión vencida o no disponible", 401);
    if (session.user.accountStatus !== AccountStatus.ACTIVE) throw new AppError("Cuenta no disponible", 403);
    req.user = { id: session.userId, sessionId: session.id, scope: session.scope, role: session.user.role, mfaVerified: session.mfaVerified && session.user.twoFactorEnabled };
    next();
  } catch (error) { next(error); }
};

export function requireVerified(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.scope !== "access") return next(new AppError("Verifica tu cuenta antes de continuar", 403));
  next();
}

export const authenticate = [authenticateSession, requireVerified];

export const authorize = (...roles: UserRole[]) => (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) return next(new AppError("No autenticado", 401));
  if (!roles.includes(req.user.role)) return next(new AppError("No tienes permisos para acceder a este recurso", 403));
  next();
};

export function requireStaffMfa(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.mfaVerified) return next(new AppError("Configura 2FA para acceder al panel de personal", 403));
  next();
}
