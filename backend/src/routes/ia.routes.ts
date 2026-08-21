/* ============================================================
   BANCA NEN — Rutas de Inteligencia Artificial
   GET /v1/ia/predictions?assetId=  → score 0-100 + explicación
   GET /v1/ia/model                 → metadatos del modelo
   ============================================================ */
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getPredictions, getModelInfo } from "../controllers/ia.controller";

const router = Router();

router.use(authenticate);

router.get("/predictions", getPredictions);
router.get("/model", getModelInfo);

export default router;
