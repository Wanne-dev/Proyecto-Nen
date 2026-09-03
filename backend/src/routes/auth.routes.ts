import { Router } from "express";
import {
  register, login, verifyEmailCode, verifyPhoneCode, resendVerification,
  forgotPassword, resetPassword, enable2FA, disable2FA, getProfile
} from "../controllers/auth.controller";
import { validate } from "../middleware/validation.middleware";
import { registerSchema, loginSchema, verifyCodeSchema, forgotPasswordSchema, resetPasswordSchema } from "../validators/auth.validator";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Registro, inicio de sesión y recuperación de cuenta
 */

/**
 * @swagger
 * /v1/auth/register:
 *   post:
 *     summary: Registra un nuevo usuario (KYC básico)
 *     security: []
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, lastName, documentType, documentNumber, dateOfBirth, phone, password]
 *             properties:
 *               email: { type: string, format: email }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               documentType: { type: string, enum: [cc, ce, pasaporte] }
 *               documentNumber: { type: string }
 *               dateOfBirth: { type: string, format: date }
 *               phone: { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       201: { description: Usuario creado (pendiente de verificación) }
 *       400: { description: Datos inválidos }
 */
router.post("/register", validate(registerSchema), register);

/**
 * @swagger
 * /v1/auth/login:
 *   post:
 *     summary: Inicia sesión (JWT + 2FA opcional)
 *     security: []
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *               twoFactorCode: { type: string, description: Código TOTP/SMS de 6 dígitos }
 *     responses:
 *       200: { description: Token de acceso y datos del usuario }
 *       401: { description: Credenciales inválidas }
 */
router.post("/login", validate(loginSchema), login);

router.post("/verify-email", authenticate, validate(verifyCodeSchema), verifyEmailCode);
router.post("/verify-phone", authenticate, validate(verifyCodeSchema), verifyPhoneCode);
router.post("/resend-verification", authenticate, resendVerification);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/enable-2fa", authenticate, enable2FA);
router.post("/disable-2fa", authenticate, disable2FA);
router.get("/profile", authenticate, getProfile);

export default router;
