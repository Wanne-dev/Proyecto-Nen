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
    signal: AbortSignal.timeout(12_000),
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

  // Solo el modo de correo local muestra el OTP. Nunca registrar códigos
  // con un proveedor real ni en un proceso de producción.
  if (process.env.NODE_ENV !== "production" && EMAIL_PROVIDER === "console") {
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
      logger.info(`Email enviado (resend) a ${to} [${debugLabel}] id=${id}`);
      return { sent: true, provider: "resend", id };
    }

    const info = await getTransporter().sendMail({ from: FROM_EMAIL, to, subject, html, text });
    logger.info(`Email enviado (smtp) a ${to} [${debugLabel}] id=${info.messageId}`);
    return { sent: true, provider: "smtp", id: info.messageId };
  } catch (error: any) {
    const code = error?.code;
    const diagnostic = typeof code === "string" && /^[A-Z_]{2,25}$/.test(code) ? ` (${code})` : "";
    logger.warn(`No fue posible enviar el mensaje vía ${EMAIL_PROVIDER}${diagnostic}`);
    return { sent: false, provider: EMAIL_PROVIDER };
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

const escapeHtml = (value: string) => value
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

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
  const link = token ? `${FRONTEND_URL}/reset-password#token=${encodeURIComponent(token)}` : "";
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
         <a href="${FRONTEND_URL}/asistente" style="display:inline-block;background:#00d4aa;color:#000;font-weight:600;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px;">Ir al asistente</a>
       </p>`
    ),
    text: `Hola ${firstName}, tu cuenta BANCA NEN fue verificada correctamente.`,
    debugLabel: "BIENVENIDA",
    debugValue: firstName,
  });

/* ---------------- Correos transaccionales ---------------- */

export interface OrderMailData {
  side: "compra" | "venta";
  symbol: string;
  quantity: string;
  totalUsd: string;
  feeUsd: string;
  priceUsd: string;
  at: string;
}

export interface MovementMailData {
  kind: "depósito" | "retiro";
  amount: string;
  currency: string;
  totalUsd: string;
  fee?: string;
  at: string;
}

function activityBody(name: string, intro: string, rows: Array<[string, string]>) {
  const safeName = escapeHtml(name || "usuario");
  const details = rows.map(([label, value]) => `
    <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <span style="color:#8e8e93;font-size:13px;">${escapeHtml(label)}</span>
      <strong style="color:#f5f5f7;font-size:13px;text-align:right;">${escapeHtml(value)}</strong>
    </div>`).join("");
  return `
    <p style="color:#f5f5f7;font-size:15px;line-height:1.6;">Hola ${safeName}, ${escapeHtml(intro)}</p>
    <div style="margin:22px 0 0;">${details}</div>
    <p style="color:#636366;font-size:12px;margin:22px 0 0;">El saldo de BANCA NEN es virtual y no representa dinero real. Este correo es solo un comprobante automático.</p>`;
}

/** Confirmación por correo de una orden de compra o venta simulada. */
export const sendOrderEmail = (to: string, firstName: string, data: OrderMailData): Promise<SendResult> => {
  const subject = `Confirmación de ${data.side} · ${data.symbol} · BANCA NEN`;
  const rows: Array<[string, string]> = [
    ["Operación", `${data.side === "compra" ? "Compra" : "Venta"} simulada`],
    ["Activo", data.symbol],
    ["Cantidad", data.quantity],
    ["Precio de ejecución", `$${data.priceUsd} USD`],
    ["Total", `$${data.totalUsd} USD`],
    ["Comisión", `$${data.feeUsd} USD`],
    ["Fecha", data.at],
  ];
  return sendMail({
    to, subject,
    html: shell("BANCA NEN", "Comprobante de operación", activityBody(firstName, "tu orden fue ejecutada.", rows)),
    text: `${subject}\n${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}\nSaldo virtual, no dinero real.`,
    debugLabel: `ORDEN ${data.side.toUpperCase()}`,
    debugValue: `${data.symbol} ${data.quantity}`,
  });
};

/** Confirmación por correo de un depósito o retiro de la billetera virtual. */
export const sendMovementEmail = (to: string, firstName: string, data: MovementMailData): Promise<SendResult> => {
  const subject = `${data.kind === "depósito" ? "Depósito" : "Retiro"} registrado · BANCA NEN`;
  const rows: Array<[string, string]> = [
    ["Movimiento", data.kind === "depósito" ? "Depósito acreditado" : "Retiro procesado"],
    ["Monto", `${data.amount} ${data.currency}`],
    ["Equivalente", `$${data.totalUsd} USD`],
    ...(data.fee ? [["Comisión", `${data.fee} ${data.currency}`] as [string, string]] : []),
    ["Fecha", data.at],
  ];
  return sendMail({
    to, subject,
    html: shell("BANCA NEN", "Comprobante de movimiento", activityBody(firstName, `tu ${data.kind} fue procesado.`, rows)),
    text: `${subject}\n${rows.map(([label, value]) => `${label}: ${value}`).join("\n")}\nSaldo virtual, no dinero real.`,
    debugLabel: `MOVIMIENTO ${data.kind.toUpperCase()}`,
    debugValue: `${data.amount} ${data.currency}`,
  });
};

/**
 * Comprueba la configuración al arrancar el servidor.
 * Muestra un aviso claro en vez de fallar en silencio cuando llegue un registro.
 */
export const verifyEmailConfig = async (): Promise<boolean> => {
  if (EMAIL_PROVIDER === "console") {
    logger.warn(
      process.env.NODE_ENV === "production"
        ? "EMAIL: sin proveedor; el entorno no envía ni registra códigos."
        : "EMAIL: modo consola local. Usa cuentas ficticias; no se envían correos reales."
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
  sendOrderEmail,
  sendMovementEmail,
  verifyEmailConfig,
  EMAIL_PROVIDER,
};
