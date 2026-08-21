/* ============================================================
   BANCA NEN — Rutas de Órdenes de Trading
   GET    /v1/orders            → órdenes del usuario (paginadas)
   POST   /v1/orders            → crear orden (market se llena al instante)
   DELETE /v1/orders/:id        → cancelar orden abierta
   ============================================================ */
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { createOrder, listOrders, cancelOrder } from "../controllers/order.controller";

const router = Router();

router.use(authenticate);

router.get("/", listOrders);
router.post("/", createOrder);
router.delete("/:id", cancelOrder);

export default router;
