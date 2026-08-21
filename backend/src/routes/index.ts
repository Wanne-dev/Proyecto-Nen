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

export default router;
