/* ============================================================
   BANCA NEN — Servicio de Email
   Re-exporta la implementación real de config/email para ofrecer
   una API de servicio estable al resto de la app.
   ============================================================ */
export {
  EMAIL_PROVIDER,
  FROM_EMAIL,
  FRONTEND_URL,
  sendVerificationEmail,
  sendPasswordResetEmail,
  send2FACodeEmail,
  sendWelcomeEmail,
  verifyEmailConfig,
} from "../config/email";
