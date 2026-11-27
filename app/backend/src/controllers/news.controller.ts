import type { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler.middleware";
import { analyzeNewsImpact } from "../services/gemini-chat.service";
import { fetchTradingNews, newsCategory } from "../services/news/googleTradingNews.service";

export async function listNews(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, category } = req.query;
    if (q !== undefined && (typeof q !== "string" || q.length > 120)) {
      throw new AppError("La búsqueda debe tener entre 1 y 120 caracteres", 400);
    }
    const parsed = category === undefined ? "all" : newsCategory(category);
    if (!parsed) throw new AppError("La categoría de noticias no es válida", 400);
    res.json({ success: true, data: await fetchTradingNews(q, parsed) });
  } catch (error) {
    next(error);
  }
}

export async function analyzeNews(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, snippet } = req.body ?? {};
    if (typeof title !== "string" || !title.trim() || title.length > 300) {
      throw new AppError("Envía un titular de 1 a 300 caracteres", 400);
    }
    if (snippet !== undefined && (typeof snippet !== "string" || snippet.length > 800)) {
      throw new AppError("El texto de la noticia no puede superar 800 caracteres", 400);
    }
    res.json({ success: true, data: await analyzeNewsImpact(title, snippet ?? "") });
  } catch (error) {
    next(error);
  }
}
