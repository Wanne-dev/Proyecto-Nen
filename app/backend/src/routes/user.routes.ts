/* ============================================================
   BANCA NEN — Rutas de Usuario
   GET    /v1/user/me             → perfil
   PATCH  /v1/user/me             → actualizar perfil
   GET    /v1/user/settings       → preferencias
   PATCH  /v1/user/settings       → actualizar preferencias
   ============================================================ */
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { updateProfileSchema, updateSettingsSchema } from "../validators/user.validator";
import {
  getMe,
  updateMe,
  getMySettings,
  updateMySettings,
} from "../controllers/user.controller";

const router = Router();

router.use(authenticate);

router.get("/me", getMe);
router.patch("/me", validate(updateProfileSchema), updateMe);
router.get("/settings", getMySettings);
router.patch("/settings", validate(updateSettingsSchema), updateMySettings);

export default router;
