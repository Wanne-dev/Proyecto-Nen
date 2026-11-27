import type { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler.middleware";
import { chatWithGemini } from "../services/gemini-chat.service";
import { getAnalysisMethod, getPredictions as listPredictions } from "../services/ia.service";

export async function getPredictions(req: Request, res: Response, next: NextFunction) {
  try {
    const { assetId } = req.query;
    if (assetId !== undefined && (typeof assetId !== "string" || !assetId.trim() || assetId.length > 128)) {
      throw new AppError("El identificador del activo no es válido", 400);
    }
    res.json({ success: true, data: await listPredictions(assetId) });
  } catch (error) {
    next(error);
  }
}

export function getModelInfo(_req: Request, res: Response) {
  res.json({ success: true, data: getAnalysisMethod() });
}

export async function chat(req: Request, res: Response, next: NextFunction) {
  try {
    const message: unknown = req.body?.message;
    if (typeof message !== "string" || !message.trim() || message.length > 1000) {
      throw new AppError("Escribe una consulta de 1 a 1000 caracteres", 400);
    }
    res.json({ success: true, data: await chatWithGemini(req.user!.id, message.trim(), req.user!.role) });
  } catch (error) {
    next(error);
  }
}
