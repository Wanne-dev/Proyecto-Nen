import nodemailer from "nodemailer";
import logger from "./logger";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  family: 4,
});

export const sendVerificationEmail = async (to: string, code: string) => {
  console.log("========================================");
  console.log("  CODIGO DE VERIFICACION: " + code);
  console.log("  Para: " + to);
  console.log("========================================");

  const mailOptions = {
    from: process.env.SMTP_FROM || "BANCA NEN <noreply@banca-nen.com>",
    to,
    subject: "BANCA NEN - Tu codigo de verificacion",
    html: `
      <div style="background:#0a0a0a;padding:40px;font-family:system-ui,sans-serif;">
        <div style="max-width:480px;margin:0 auto;background:#1a1a1a;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.05);">
          <h1 style="color:#00d4aa;font-size:24px;margin:0 0 8px;">BANCA NEN</h1>
          <p style="color:#8e8e93;font-size:14px;margin:0 0 32px;">Verificacion de cuenta</p>
          <p style="color:#f5f5f7;font-size:16px;line-height:1.6;">Tu codigo de verificacion es:</p>
          <p style="color:#00d4aa;font-size:36px;font-weight:700;letter-spacing:8px;margin:16px 0;text-align:center;">${code}</p>
          <p style="color:#636366;font-size:12px;margin-top:24px;">Ingresa este codigo en la app. No lo compartas con nadie.</p>
          <p style="color:#48484a;font-size:11px;">Este codigo expira en 10 minutos.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info("Email de verificacion enviado a: " + to);
  } catch (error) {
    logger.warn("No se pudo enviar email a " + to + " - Usa el codigo de la consola");
  }
};

export const sendPasswordResetEmail = async (to: string, token: string) => {
  console.log("========================================");
  console.log("  TOKEN DE RESET: " + token);
  console.log("  Para: " + to);
  console.log("========================================");

  const resetUrl = "http://localhost:5173/reset-password/" + token;

  const mailOptions = {
    from: process.env.SMTP_FROM || "BANCA NEN <noreply@banca-nen.com>",
    to,
    subject: "BANCA NEN - Recupera tu contrasena",
    html: `
      <div style="background:#0a0a0a;padding:40px;font-family:system-ui,sans-serif;">
        <div style="max-width:480px;margin:0 auto;background:#1a1a1a;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.05);">
          <h1 style="color:#00d4aa;font-size:24px;margin:0 0 8px;">BANCA NEN</h1>
          <p style="color:#8e8e93;font-size:14px;margin:0 0 32px;">Recuperacion de contrasena</p>
          <p style="color:#f5f5f7;font-size:16px;line-height:1.6;">Se solicito un cambio de contrasena para tu cuenta:</p>
          <a href="${resetUrl}" style="display:inline-block;background:#00d4aa;color:#000;font-weight:600;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px;margin:16px 0;">Cambiar contrasena</a>
          <p style="color:#636366;font-size:12px;margin-top:24px;">Si no solicitaste esto, ignora este mensaje.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info("Email de reset enviado a: " + to);
  } catch (error) {
    logger.warn("No se pudo enviar email de reset a " + to + " - Usa el token de la consola");
  }
};

export const send2FACodeEmail = async (to: string, code: string) => {
  console.log("========================================");
  console.log("  CODIGO 2FA: " + code);
  console.log("  Para: " + to);
  console.log("========================================");

  const mailOptions = {
    from: process.env.SMTP_FROM || "BANCA NEN <noreply@banca-nen.com>",
    to,
    subject: "BANCA NEN - Tu codigo de verificacion",
    html: `
      <div style="background:#0a0a0a;padding:40px;font-family:system-ui,sans-serif;">
        <div style="max-width:480px;margin:0 auto;background:#1a1a1a;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.05);">
          <h1 style="color:#00d4aa;font-size:24px;margin:0 0 8px;">BANCA NEN</h1>
          <p style="color:#8e8e93;font-size:14px;margin:0 0 32px;">Codigo de verificacion</p>
          <p style="color:#f5f5f7;font-size:16px;">Tu codigo es:</p>
          <p style="color:#00d4aa;font-size:36px;font-weight:700;letter-spacing:8px;margin:16px 0;">${code}</p>
          <p style="color:#636366;font-size:12px;">Este codigo expira en 10 minutos.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info("Codigo 2FA enviado a: " + to);
  } catch (error) {
    logger.warn("No se pudo enviar codigo 2FA a " + to + " - Usa el codigo de la consola");
  }
};