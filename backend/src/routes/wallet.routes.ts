import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getWallet, getWalletBalances, createWallet, depositFunds, withdrawFunds, listTransactions } from "../controllers/wallet.controller";

const router = Router();

router.get("/", authenticate, getWallet);
router.post("/create", authenticate, createWallet);
router.get("/balances", authenticate, getWalletBalances);
router.post("/deposit", authenticate, depositFunds);
router.post("/withdraw", authenticate, withdrawFunds);
router.get("/transactions", authenticate, listTransactions);

export default router;