import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { depositSchema, withdrawSchema } from "../validators/wallet.validator";
import { getWallet, getWalletBalances, createWallet, depositFunds, withdrawFunds, listTransactions } from "../controllers/wallet.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Wallet
 *     description: Billetera multi-moneda, depósitos y retiros
 */

router.use(authenticate);

router.get("/", getWallet);
router.post("/create", createWallet);
router.get("/balances", getWalletBalances);

/**
 * @swagger
 * /v1/wallet/deposit:
 *   post:
 *     summary: Deposita fondos en la billetera
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
 *       200: { description: Depósito acreditado }
 *       400: { description: Datos inválidos o saldo insuficiente }
 */
router.post("/deposit", validate(depositSchema), depositFunds);

/**
 * @swagger
 * /v1/wallet/withdraw:
 *   post:
 *     summary: Retira fondos de la billetera
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
 *       200: { description: Retiro procesado }
 *       400: { description: Saldo insuficiente }
 */
router.post("/withdraw", validate(withdrawSchema), withdrawFunds);

router.get("/transactions", listTransactions);

export default router;