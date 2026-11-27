import { Router } from "express";
import * as controller from "../controllers/auth.controller";
import { validate } from "../middleware/validation.middleware";
import {
  registerSchema, loginSchema, verifyCodeSchema, forgotPasswordSchema, resetPasswordSchema,
  setupTwoFactorSchema, disableTwoFactorSchema, changePasswordSchema,
} from "../validators/auth.validator";
import { authenticate, authenticateSession } from "../middleware/auth.middleware";

const router = Router();
router.use((_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });

/**
 * @swagger
 * /v1/auth/register:
 *   post:
 *     summary: Registra una cuenta de prueba y abre una sesión de verificación
 *     security: []
 *     tags: [Auth]
 *     responses:
 *       201: { description: Cuenta creada; cookies HttpOnly y código fuera de la respuesta }
 *       409: { description: Cuenta existente }
 */
router.post("/register", validate(registerSchema), controller.register);

/**
 * @swagger
 * /v1/auth/login:
 *   post:
 *     summary: Inicia sesión; puede requerir TOTP
 *     security: []
 *     tags: [Auth]
 *     responses:
 *       200: { description: Sesión por cookies HttpOnly o solicitud de TOTP sin abrir sesión }
 *       401: { description: Credenciales inválidas }
 *       429: { description: Demasiados intentos }
 */
router.post("/login", validate(loginSchema), controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);
router.get("/profile", authenticateSession, controller.getProfile);
router.post("/verify-email", authenticateSession, validate(verifyCodeSchema), controller.verifyEmailCode);
router.post("/verify-phone", authenticateSession, validate(verifyCodeSchema), controller.verifyPhoneCode);
router.post("/resend-verification", authenticateSession, controller.resendVerification);
router.post("/forgot-password", validate(forgotPasswordSchema), controller.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), controller.resetPassword);
router.post("/2fa/setup", authenticate, validate(setupTwoFactorSchema), controller.setup2FA);
router.post("/2fa/confirm", authenticate, validate(verifyCodeSchema), controller.confirm2FA);
router.post("/2fa/disable", authenticate, validate(disableTwoFactorSchema), controller.disable2FA);
router.post("/password", authenticate, validate(changePasswordSchema), controller.changePassword);
router.get("/sessions", authenticate, controller.sessions);
router.delete("/sessions/others", authenticate, controller.revokeOtherSessions);
router.delete("/sessions/:id", authenticate, controller.revokeSession);

export default router;
