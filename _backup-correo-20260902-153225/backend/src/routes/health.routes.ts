import { Router, Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { EMAIL_PROVIDER } from "../config/email";

const router = Router();

/**
 * Health check real: lanza una consulta a la base de datos.
 * Docker usa este endpoint para saber si el backend esta sano de verdad.
 * Devuelve 503 si la base no responde, para que el healthcheck falle.
 */
router.get("/health", async (_req: Request, res: Response) => {
  let baseDatos = "desconectada";
  let sano = false;

  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.query("SELECT 1");
      baseDatos = "conectada";
      sano = true;
    }
  } catch (e: any) {
    baseDatos = "error: " + (e?.message || "desconocido");
  }

  res.status(sano ? 200 : 503).json({
    status: sano ? "ok" : "degradado",
    service: "BANCA NEN API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    database: baseDatos,
    email: EMAIL_PROVIDER,
    uptime: Math.round(process.uptime()) + "s",
  });
});

export default router;
