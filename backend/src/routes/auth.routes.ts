import { Router } from "express";
import {
  register, login, verifyEmailCode, verifyPhoneCode, resendVerification,
  forgotPassword, resetPassword, enable2FA, disable2FA, getProfile
} from "../controllers/auth.controller";
import { validate } from "../middleware/validation.middleware";
import { registerSchema, loginSchema, verifyCodeSchema, forgotPasswordSchema, resetPasswordSchema } from "../validators/auth.validator";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", validate(registerSchema), register);
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
