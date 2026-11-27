import { Router, type NextFunction, type Request, type Response } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { authenticate } from "../middleware/auth.middleware";
import { chat, getPredictions, getModelInfo } from "../controllers/ia.controller";

const router = Router();
// Cuota propia por usuario para no agotar el plan gratuito del proveedor.
const chatLimiter = new RateLimiterMemory({ points: 12, duration: 60, blockDuration: 60 });

async function limitChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await chatLimiter.consume(req.user!.id);
    next();
  } catch {
    res.status(429).json({ status: "fail", message: "Demasiadas consultas al asistente. Espera un momento y vuelve a intentarlo." });
  }
}

router.use(authenticate);
router.get("/predictions", getPredictions);
router.get("/model", getModelInfo);
router.post("/chat", limitChat, chat);

export default router;
