/* Cabeceras de seguridad adicionales — BANCA NEN
 * (helmet ya cubre las básicas; aquí se añaden políticas explícitas).
 */
import { Request, Response, NextFunction } from "express";

export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  next();
};
