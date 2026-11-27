/* Limitador de peticiones por IP (en memoria) — BANCA NEN */
import { Request, Response, NextFunction } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { rateLimitConfig } from "../config/rate-limit";

const limiter = new RateLimiterMemory({
  points: rateLimitConfig.points,
  duration: rateLimitConfig.duration,
  blockDuration: rateLimitConfig.blockDuration,
});

export const rateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const key = req.ip || req.socket.remoteAddress || "unknown";
  try {
    await limiter.consume(key);
    next();
  } catch {
    res.status(429).json({
      status: "fail",
      message: "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
    });
  }
};
