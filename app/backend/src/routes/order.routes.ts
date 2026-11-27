/* ============================================================
   BANCA NEN — Rutas de Órdenes de Trading
   GET    /v1/orders            → órdenes del usuario (paginadas)
   POST   /v1/orders            → crear orden (market se llena al instante)
   DELETE /v1/orders/:id        → cancelar orden abierta
   ============================================================ */
import { Router } from "express";
import { requireVirtualOperations } from "../middleware/virtual-operations.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { createOrderSchema } from "../validators/order.validator";
import { createOrder, listOrders, cancelOrder } from "../controllers/order.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Orders
 *     description: Órdenes virtuales de compra y venta
 */

router.use(authenticate);

router.get("/", listOrders);

/**
 * @swagger
 * /v1/orders:
 *   post:
 *     summary: Ejecuta una orden Market simulada en BTC, ETH o USDC
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol, type, side, quantity]
 *             properties:
 *               symbol: { type: string, enum: [BTC, ETH, USDC] }
 *               type: { type: string, enum: [market] }
 *               side: { type: string, enum: [buy, sell] }
 *               quantity: { type: number, exclusiveMinimum: 0 }
 *     responses:
 *       201: { description: Orden simulada ejecutada con la cotización del servidor }
 *       400: { description: Datos inválidos o saldo insuficiente }
 *       403: { description: Cuenta no verificada o simulación deshabilitada }
 */
router.post("/", requireVirtualOperations, validate(createOrderSchema), createOrder);

router.delete("/:id", cancelOrder);

export default router;