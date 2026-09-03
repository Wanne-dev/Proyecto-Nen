/* ============================================================
   BANCA NEN — Rutas de Reportes del usuario
   GET /v1/reports/portfolio?range=7d|30d|90d
   GET /v1/reports/transactions?range=7d|30d|90d
   ============================================================ */
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validateQuery } from "../middleware/validation.middleware";
import { reportQuerySchema } from "../validators/report.validator";
import { getPortfolioReport, getTransactionsReport } from "../controllers/report.controller";

const router = Router();

router.use(authenticate);

router.get("/portfolio", validateQuery(reportQuerySchema), getPortfolioReport);
router.get("/transactions", validateQuery(reportQuerySchema), getTransactionsReport);

export default router;
