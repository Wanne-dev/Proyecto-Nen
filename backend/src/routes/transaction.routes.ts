/* ============================================================
   BANCA NEN — Rutas de Transacciones
   GET  /v1/transactions?type=&page=&limit=  → historial paginado
   GET  /v1/transactions/summary?days=       → resumen del periodo
   GET  /v1/transactions/:id                 → detalle
   ============================================================ */
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validateQuery } from "../middleware/validation.middleware";
import { listTransactionsQuerySchema } from "../validators/transaction.validator";
import {
  listUserTransactions,
  getTransactionById,
  getTransactionsSummary,
} from "../controllers/transaction.controller";

const router = Router();

router.use(authenticate);

router.get("/summary", validateQuery(listTransactionsQuerySchema), getTransactionsSummary);
router.get("/", validateQuery(listTransactionsQuerySchema), listUserTransactions);
router.get("/:id", getTransactionById);

export default router;
