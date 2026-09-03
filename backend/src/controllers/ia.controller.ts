/* Controladores de IA — BANCA NEN */
import { Request, Response, NextFunction } from "express";
import { getPredictions as getPredictionsService, MODEL_INFO } from "../services/ia.service";

export async function getPredictions(req: Request, res: Response, next: NextFunction) {
  try {
    const assetId = req.query.assetId as string | undefined;
    const data = await getPredictionsService(assetId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getModelInfo(_req: Request, res: Response, _next: NextFunction) {
  res.json({ success: true, data: MODEL_INFO });
}
