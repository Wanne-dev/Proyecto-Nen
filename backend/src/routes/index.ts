import { Router } from "express";
import healthRoutes from "./health.routes";
import authRoutes from "./auth.routes";

const router = Router();

router.use("/v1", healthRoutes);
router.use("/v1/auth", authRoutes);

export default router;
