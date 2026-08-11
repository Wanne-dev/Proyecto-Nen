import { Router } from "express";
import healthRoutes from './health.routes';
import walletRoutes from './wallet.routes';
import marketRoutes from './market.routes';
import authRoutes from "./auth.routes";

const router = Router();

router.use("/v1", healthRoutes);
router.use('/v1/auth', authRoutes);
router.use('/v1/wallet', walletRoutes);
router.use('/v1/market', marketRoutes);

export default router;
