/* ============================================================
   BANCA NEN — Rutas de Órdenes de Trading
   GET    /v1/orders            → órdenes del usuario (paginadas)
   POST   /v1/orders            → crear orden (market se llena al instante)
   DELETE /v1/orders/:id        → cancelar orden abierta
   ============================================================ */
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { createOrderSchema } from "../validators/order.validator";
import { createOrder, listOrders, cancelOrder } from "../controllers/order.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Orders
 *     description: Órdenes de compra/venta con score de IA
 */

router.use(authenticate);

router.get("/", listOrders);

/**
 * @swagger
 * /v1/orders:
 *   post:
 *     summary: Crea una orden de compra/venta
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol, type, side, quantity]
 *             properties:
 *               symbol: { type: string, example: BTC }
 *               type: { type: string, enum: [market, limit, stop_loss, take_profit, stop_limit, trailing_stop] }
 *               side: { type: string, enum: [buy, sell] }
 *               quantity: { type: number, exclusiveMinimum: 0 }
 *               price: { type: number }
 *               stopPrice: { type: number }
 *     responses:
 *       201: { description: Orden creada (o ejecutada si es de mercado) }
 *       400: { description: Datos inválidos o saldo insuficiente }
 */
router.post("/", validate(createOrderSchema), createOrder);

router.delete("/:id", cancelOrder);

export default router;