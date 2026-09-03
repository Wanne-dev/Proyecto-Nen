/* Asigna un id de petición (X-Request-Id) — BANCA NEN */
import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = req.headers["x-request-id"];
  const id = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
  res.setHeader("X-Request-Id", id);
  (req as Request & { requestId: string }).requestId = id;
  next();
};
