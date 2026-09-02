/* ============================================================
   BANCA NEN — Servicio de correo (REAL)
   ------------------------------------------------------------
   Soporta 3 proveedores, seleccionados con EMAIL_PROVIDER:
     - "resend"  -> API HTTP de Resend (recomendado, no requiere SMTP)
     - "smtp"    -> Cualquier SMTP (Gmail, Outlook, Brevo, Mailtrap...)
     - "console" -> No envía nada, imprime el código en consola (dev)
   Si no se define EMAIL_PROVIDER se detecta automáticamente:
     RESEND_API_KEY -> resend | SMTP_USER+SMTP_PASS -> smtp | else console
   ============================================================ */
import nodemailer, { Transporter } from "nodemailer";
import logger from "./logger";

type Provider = "resend" | "smtp" | "console";

const env = (k: string, d = "") => (process.env[k] ?? d).trim();

function detectProvider(): Provider {
  const explicit = env("EMAIL_PROVIDER").toLowerCase();
  if (explicit === "resend" || explicit === "smtp" || explicit === "console") return explicit;
  if (env("RESEND_API_KEY")) return "resend";
  if (env("SMTP_USER") && env("SMTP_PASS")) return "smtp";
  return "console";
}

export const EMAIL_PROVIDER: Provider = detectProvider();

export const FROM_EMAIL =
  env("SMTP_FROM") || env("EMAIL_FROM") || "BANCA NEN <onboarding@resend.dev>";

export const FRONTEND_URL = (env("FRONTEND_URL") || "http://localhost:5173").replace(/\/+$/, "");

/* ---------------- SMTP ---------------- */
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  const port = parseInt(env("SMTP_PORT", "587"), 10);
  const smtpOptions: any = {
    host: env("SMTP_HOST", "smtp.gmail.com"),
    port,
    // 465 = SSL implícito; 587/2525 = STARTTLS
    secure: env("SMTP_SECURE") ? env("SMTP_SECURE") === "true" : port === 465,
    auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") },
    requireTLS: port === 587,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    family: 4,
  };
  transporter = nodemailer.createTransport(smtpOptions);
  return transporter;
}

/* ---------------- Resend ---------------- */
async function sendWithResend(to: string, subject: string, html: string, text: string) {
  const apiKey = env("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY no configurada");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html, text }),
  });

  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Resend ${res.status}: ${body?.message || body?.error?.message || JSON.stringify(body)}`
    );
  }
  return body?.id as string | undefined;
}

/* ---------------- Envío unificado ---------------- */
export interface SendResult {
  sent: boolean;
  provider: Provider;
  id?: string;
  error?: string;
}

async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  debugLabel: string;
  debugValue: string;
}): Promise<SendResult> {
  const { to, subject, html, text, debugLabel, debugValue } = opts;

  // En dev siempre dejamos rastro en consola para poder probar sin correo.
  if (process.env.NODE_ENV !== "production" || EMAIL_PROVIDER === "console") {
    console.log("========================================");
    console.log(`  ${debugLabel}: ${debugValue}`);
    console.log(`  Para: ${to}`);
    console.log(`  Proveedor: ${EMAIL_PROVIDER}`);
    console.log("========================================");
  }

  if (EMAIL_PROVIDER === "console") {
    return { sent: false, provider: "console" };
  }

  try {
    if (EMAIL_PROVIDER === "resend") {
      const id = await sendWithResend(to, subject, html, text);
      logger.info(`Email enviado (resend) a ${to} [${subject}] id=${id}`);
      return { sent: true, provider: "resend", id };
    }

    const info = await getTransporter().sendMail({ from: FROM_EMAIL, to, subject, html, text });
    logger.info(`Email enviado (smtp) a ${to} [${subject}] id=${info.messageId}`);
    return { sent: true, provider: "smtp", id: info.messageId };
  } catch (error: any) {
    const msg = error?.message || String(error);
    // Log con la causa REAL para poder depurar (antes se ocultaba).
    logger.error(`FALLO al enviar email a ${to} [${subject}] via ${EMAIL_PROVIDER}: ${msg}`);
    return { sent: false, provider: EMAIL_PROVIDER, error: msg };
  }
}

/* ---------------- Plantillas ---------------- */
const shell = (title: string, subtitle: string, inner: string) => `
<div style="background:#0a0a0a;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#1a1a1a;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.06);">
    <h1 style="color:#00d4aa;font-size:24px;margin:0 0 8px;letter-spacing:-0.5px;">${title}</h1>
    <p style="color:#8e8e93;font-size:14px;margin:0 0 32px;">${subtitle}</p>
    ${inner}
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:32px 0 16px;" />
    <p style="color:#48484a;font-size:11px;margin:0;">Este es un mensaje automático de BANCA NEN. No respondas a este correo.</p>
  </div>
</div>`;

const codeBlock = (code: string) => `
  <p style="color:#f5f5f7;font-size:16px;line-height:1.6;margin:0 0 8px;">Tu código de verificación es:</p>
  <p style="color:#00d4aa;font-size:38px;font-weight:700;letter-spacing:10px;margin:16px 0;text-align:center;background:#0a0a0a;border-radius:12px;padding:20px 0;">${code}</p>
  <p style="color:#636366;font-size:12px;margin:16px 0 0;">Ingresa este código en la aplicación. Nunca lo compartas con nadie, ni siquiera con personal de BANCA NEN.</p>
  <p style="color:#48484a;font-size:11px;margin:8px 0 0;">El código expira en 10 minutos.</p>`;

/* ---------------- API pública ---------------- */

/** Código de 6 dígitos para verificar el email en el registro. */
export const sendVerificationEmail = (to: string, code: string): Promise<SendResult> =>
  sendMail({
    to,
    subject: `${code} es tu código de verificación · BANCA NEN`,
    html: shell("BANCA NEN", "Verificación de cuenta", codeBlock(code)),
    text: `BANCA NEN\nTu código de verificación es: ${code}\nExpira en 10 minutos.`,
    debugLabel: "CODIGO DE VERIFICACION",
    debugValue: code,
  });

/** Código de 6 dígitos + enlace para restablecer la contraseña. */
export const sendPasswordResetEmail = (
  to: string,
  code: string,
  token?: string
): Promise<SendResult> => {
  const link = token ? `${FRONTEND_URL}/reset-password/${token}` : "";
  const button = link
    ? `<p style="text-align:center;margin:24px 0 0;">
         <a href="${link}" style="display:inline-block;background:#00d4aa;color:#000;font-weight:600;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px;">Cambiar contraseña</a>
       </p>
       <p style="color:#48484a;font-size:11px;word-break:break-all;margin:12px 0 0;">O copia este enlace: ${link}</p>`
    : "";

  return sendMail({
    to,
    subject: `${code} · Recupera tu contraseña · BANCA NEN`,
    html: shell(
      "BANCA NEN",
      "Recuperación de contraseña",
      `<p style="color:#f5f5f7;font-size:16px;line-height:1.6;margin:0;">Recibimos una solicitud para cambiar tu contraseña. Usa este código:</p>
       ${codeBlock(code)}
       ${button}
       <p style="color:#636366;font-size:12px;margin:20px 0 0;">Si no solicitaste esto, ignora este mensaje: tu contraseña seguirá siendo la misma.</p>`
    ),
    text: `BANCA NEN\nCódigo para restablecer tu contraseña: ${code}\n${link}\nExpira en 10 minutos.`,
    debugLabel: "CODIGO DE RESET",
    debugValue: `${code}  (token: ${token || "-"})`,
  });
};

/** Código 2FA por email. */
export const send2FACodeEmail = (to: string, code: string): Promise<SendResult> =>
  sendMail({
    to,
    subject: `${code} es tu código de acceso · BANCA NEN`,
    html: shell("BANCA NEN", "Código de acceso", codeBlock(code)),
    text: `BANCA NEN\nTu código de acceso es: ${code}\nExpira en 10 minutos.`,
    debugLabel: "CODIGO 2FA",
    debugValue: code,
  });

/** Correo de bienvenida (opcional, no bloquea nada si falla). */
export const sendWelcomeEmail = (to: string, firstName: string): Promise<SendResult> =>
  sendMail({
    to,
    subject: "Bienvenido a BANCA NEN",
    html: shell(
      "BANCA NEN",
      "Tu cuenta está lista",
      `<p style="color:#f5f5f7;font-size:16px;line-height:1.6;">Hola ${firstName}, tu cuenta fue verificada correctamente. Ya puedes depositar, invertir y operar.</p>
       <p style="text-align:center;margin:24px 0 0;">
         <a href="${FRONTEND_URL}/dashboard" style="display:inline-block;background:#00d4aa;color:#000;font-weight:600;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px;">Ir al dashboard</a>
       </p>`
    ),
    text: `Hola ${firstName}, tu cuenta BANCA NEN fue verificada correctamente.`,
    debugLabel: "BIENVENIDA",
    debugValue: firstName,
  });

/**
 * Comprueba la configuración al arrancar el servidor.
 * Muestra un aviso claro en vez de fallar en silencio cuando llegue un registro.
 */
export const verifyEmailConfig = async (): Promise<boolean> => {
  if (EMAIL_PROVIDER === "console") {
    logger.warn(
      "EMAIL: sin proveedor configurado. Los códigos se imprimirán SOLO en la consola. " +
        "Define RESEND_API_KEY o SMTP_USER/SMTP_PASS en backend/.env para enviar correos reales."
    );
    return false;
  }

  if (EMAIL_PROVIDER === "resend") {
    if (!env("RESEND_API_KEY").startsWith("re_")) {
      logger.error("EMAIL: RESEND_API_KEY parece inválida (debe empezar por 're_').");
      return false;
    }
    logger.info(`EMAIL: proveedor Resend listo. Remitente: ${FROM_EMAIL}`);
    return true;
  }

  try {
    await getTransporter().verify();
    logger.info(`EMAIL: SMTP conectado (${env("SMTP_HOST")}:${env("SMTP_PORT", "587")}). Remitente: ${FROM_EMAIL}`);
    return true;
  } catch (e: any) {
    logger.error(
      `EMAIL: no se pudo conectar al SMTP (${env("SMTP_HOST")}:${env("SMTP_PORT", "587")}): ${e?.message}. ` +
        "Con Gmail debes usar una CONTRASEÑA DE APLICACIÓN de 16 caracteres, no tu contraseña normal."
    );
    return false;
  }
};

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  send2FACodeEmail,
  sendWelcomeEmail,
  verifyEmailConfig,
  EMAIL_PROVIDER,
};
