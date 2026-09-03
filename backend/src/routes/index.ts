import { Router } from "express";
import healthRoutes from './health.routes';
import walletRoutes from './wallet.routes';
import marketRoutes from './market.routes';
import authRoutes from "./auth.routes";
import orderRoutes from "./order.routes";
import iaRoutes from "./ia.routes";
import adminRoutes from "./admin.routes";
import reportRoutes from "./report.routes";
import notificationRoutes from "./notification.routes";
import userRoutes from "./user.routes";
import transactionRoutes from "./transaction.routes";
import webhookRoutes from "./webhook.routes";

const router = Router();

router.use("/v1", healthRoutes);
router.use('/v1/auth', authRoutes);
router.use('/v1/wallet', walletRoutes);
router.use('/v1/market', marketRoutes);
router.use('/v1/orders', orderRoutes);
router.use('/v1/ia', iaRoutes);
router.use('/v1/admin', adminRoutes);
router.use('/v1/reports', reportRoutes);
router.use('/v1/notifications', notificationRoutes);
router.use('/v1/user', userRoutes);
router.use('/v1/transactions', transactionRoutes);
router.use('/v1/webhooks', webhookRoutes);

export default router;
