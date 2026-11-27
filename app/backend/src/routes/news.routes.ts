import { Router, type NextFunction, type Request, type Response } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { analyzeNews, listNews } from "../controllers/news.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
const analyzeLimiter = new RateLimiterMemory({ points: 20, duration: 60, blockDuration: 60 });

async function limitAnalyze(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await analyzeLimiter.consume(req.user!.id);
    next();
  } catch {
    res.status(429).json({ status: "fail", message: "Demasiados análisis de noticias. Espera un momento y vuelve a intentarlo." });
  }
}

router.use(authenticate);
router.get("/", listNews);
router.post("/analyze", limitAnalyze, analyzeNews);

export default router;
