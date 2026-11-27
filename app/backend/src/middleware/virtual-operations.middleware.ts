import type { NextFunction, Request, Response } from "express";
import { virtualOperationsEnabled } from "../config/operations";
import { AppError } from "./errorHandler.middleware";

export function requireVirtualOperations(_req: Request, _res: Response, next: NextFunction) {
  if (!virtualOperationsEnabled()) {
    return next(new AppError("Las operaciones simuladas no están habilitadas en este entorno", 403));
  }
  next();
}
