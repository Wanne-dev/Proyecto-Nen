import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler.middleware";
import { AppDataSource } from "../config/database";
import { User, UserRole } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

export interface AuthPayload {
  id: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Token de autenticacion requerido", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: decoded.id } });

    if (!user) {
      throw new AppError("Usuario no encontrado", 401);
    }

    if (user.status === "suspended") {
      throw new AppError("Tu cuenta ha sido suspendida", 403);
    }

    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (error) {
    if (error instanceof AppError) next(error);
    else next(new AppError("Token invalido o expirado", 401));
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("No autenticado", 401));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new AppError("No tienes permisos para acceder a este recurso", 403));
      return;
    }
    next();
  };
};
