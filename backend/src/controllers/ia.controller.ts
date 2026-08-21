/* Controladores de IA — BANCA NEN */
import { Request, Response, NextFunction } from "express";
import { getPredictions, MODEL_INFO } from "../services/ia.service";

export async function getPredictions(req: Request, res: Response, next: NextFunction) {
  try {
    const assetId = req.query.assetId as string | undefined;
    const data = await getPredictions(assetId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getModelInfo(_req: Request, res: Response, _next: NextFunction) {
  res.json({ success: true, data: MODEL_INFO });
}
