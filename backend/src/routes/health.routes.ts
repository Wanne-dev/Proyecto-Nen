import { Router, Request, Response } from "express";
import { AppDataSource } from "../config/database";

const router = Router();

router.get("/health", async (_req: Request, res: Response) => {
  let dbStatus = "disconnected";
  try {
    if (AppDataSource.isInitialized) {
      dbStatus = "connected";
    }
  } catch {
    dbStatus = "error";
  }

  res.json({
    status: "ok",
    service: "BANCA NEN API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

export default router;
