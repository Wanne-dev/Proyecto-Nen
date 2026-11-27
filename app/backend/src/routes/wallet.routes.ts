import { Router } from "express";
import { requireVirtualOperations } from "../middleware/virtual-operations.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { depositSchema, withdrawSchema } from "../validators/wallet.validator";
import { getWallet, getWalletBalances, createWallet, depositFunds, withdrawFunds, listTransactions } from "../controllers/wallet.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Wallet
 *     description: Billetera multi-moneda con saldo persistido en la base de datos
 */

router.use(authenticate);

router.get("/", getWallet);
router.post("/create", createWallet);
router.get("/balances", getWalletBalances);

/**
 * @swagger
 * /v1/wallet/deposit:
 *   post:
 *     summary: Acredita saldo virtual en la billetera
 *     tags: [Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currency, amount]
 *             properties:
 *               currency: { type: string, enum: [USD, COP, EUR, BTC, ETH, USDC] }
 *               amount: { type: number, exclusiveMinimum: 0 }
 *     responses:
 *       200: { description: Depósito virtual acreditado }
 *       400: { description: Datos inválidos o saldo insuficiente }
 *       403: { description: Cuenta no verificada o simulación deshabilitada }
 */
router.post("/deposit", requireVirtualOperations, validate(depositSchema), depositFunds);

/**
 * @swagger
 * /v1/wallet/withdraw:
 *   post:
 *     summary: Descuenta saldo virtual de la billetera
 *     tags: [Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currency, amount]
 *             properties:
 *               currency: { type: string, enum: [USD, COP, EUR, BTC, ETH, USDC] }
 *               amount: { type: number, exclusiveMinimum: 0 }
 *     responses:
 *       200: { description: Retiro simulado registrado }
 *       400: { description: Saldo insuficiente }
 *       403: { description: Cuenta no verificada o simulación deshabilitada }
 */
router.post("/withdraw", requireVirtualOperations, validate(withdrawSchema), withdrawFunds);

router.get("/transactions", listTransactions);

export default router;