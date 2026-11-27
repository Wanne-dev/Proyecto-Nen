import twilio from "twilio";
import logger from "./logger";

const sid = process.env.TWILIO_ACCOUNT_SID || "";
const token = process.env.TWILIO_AUTH_TOKEN || "";
const from = process.env.TWILIO_PHONE_NUMBER || "";
export const SMS_ENABLED = /^AC[a-f0-9]{32}$/i.test(sid) && !!token && /^\+[1-9]\d{6,14}$/.test(from);
const client = SMS_ENABLED ? twilio(sid, token) : null;

export const sendVerificationSMS = async (phone: string, code: string) => {
  if (!client) {
    logger.warn("Twilio no configurado - SMS simulado");
    if (process.env.NODE_ENV !== "production") console.log("[SMS SIMULADO] Codigo para " + phone + ": " + code);
    return { success: true };
  }
  try {
    const msg = await client.messages.create({
      body: "[BANCA NEN] Tu codigo de verificacion es: " + code + ". No lo compartas.",
      from,
      to: phone,
    });
    logger.info("SMS enviado a " + phone);
    return { success: true, sid: msg.sid };
  } catch (e: any) {
    logger.error("Error SMS: " + e.message);
    throw new Error("Error SMS: " + e.message);
  }
};

export const sendPasswordResetSMS = async (phone: string, code: string) => {
  if (!client) {
    logger.warn("Twilio no configurado - SMS reset simulado");
    if (process.env.NODE_ENV !== "production") console.log("[SMS SIMULADO] Codigo reset para " + phone + ": " + code);
    return { success: true };
  }
  try {
    const msg = await client.messages.create({
      body: "[BANCA NEN] Codigo reset: " + code + ". Expira en 10 min.",
      from,
      to: phone,
    });
    logger.info("SMS reset enviado a " + phone);
    return { success: true, sid: msg.sid };
  } catch (e: any) {
    logger.error("Error SMS reset: " + e.message);
    throw new Error("Error SMS: " + e.message);
  }
};