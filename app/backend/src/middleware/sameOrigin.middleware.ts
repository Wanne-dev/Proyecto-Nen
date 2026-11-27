import { Request, Response, NextFunction } from "express";
import { environment } from "../config/environment";
import { AppError } from "./errorHandler.middleware";

/** Defensa CSRF junto a cookies HttpOnly, host-only y SameSite=Strict. */
export function sameOriginMutation(req: Request, _res: Response, next: NextFunction): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const site = req.get("Sec-Fetch-Site");
  if (site && site !== "same-origin" && site !== "none") {
    return next(new AppError("La solicitud debe venir del mismo sitio", 403));
  }
  const origin = req.get("Origin");
  if (origin && site !== "same-origin" && origin !== environment.frontendUrl) {
    return next(new AppError("Origen no autorizado", 403));
  }
  next();
}
