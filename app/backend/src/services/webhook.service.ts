/* ============================================================
   BANCA NEN — Servicio de Webhooks (Wompi)
   ------------------------------------------------------------
   Verifica la firma (X-Event-Checksum) según el estándar de
   Wompi: SHA256(transaction.id + transaction.status +
   transaction.amount_in_cents + events_secret), en hexadecimal,
   y la compara en tiempo constante.
   ============================================================ */
import { createHash, timingSafeEqual } from "crypto";
import { AppDataSource } from "../config/database";
import { WebhookLog, WebhookStatus } from "../models/WebhookLog";
import logger from "../config/logger";

const repo = () => AppDataSource.getRepository(WebhookLog);

const eventsSecret = process.env.WOMPI_EVENTS_SECRET || "";

export function computeWompiChecksum(
  transactionId: string,
  status: string,
  amountInCents: number,
  secret = eventsSecret
): string {
  const data = `${transactionId}${status}${amountInCents}${secret}`;
  return createHash("sha256").update(data).digest("hex");
}

export function verifyWompiChecksum(
  transactionId: string,
  status: string,
  amountInCents: number,
  checksum: string,
  secret = eventsSecret
): boolean {
  const expected = computeWompiChecksum(transactionId, status, amountInCents, secret);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(checksum.trim().toLowerCase(), "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function logWebhook(provider: string, event: string, payload: unknown, signature?: string) {
  return repo().save(
    repo().create({
      provider,
      event,
      signature: signature || null,
      payload: (payload as object) || null,
      status: WebhookStatus.RECEIVED,
    })
  );
}

export async function markWebhook(logId: string, status: WebhookStatus, error?: string) {
  const log = await repo().findOne({ where: { id: logId } });
  if (!log) return null;
  log.status = status;
  log.error = error || null;
  log.processedAt = new Date();
  return repo().save(log);
}

/**
 * Procesa un evento de Wompi. Hoy registra el evento (trazabilidad) y
 * devuelve el resultado; el acreditamiento real del depósito se conecta
 * cuando exista la integración de pago en producción (ver ESTADO-PROYECTO.md).
 */
export async function processWompiEvent(event: string, data: any): Promise<{ handled: boolean; message: string }> {
  if (event !== "transaction.updated") {
    logger.info(`[webhook] Evento no procesado: ${event}`);
    return { handled: false, message: "Evento ignorado (solo se procesa transaction.updated)" };
  }
  const txn = data?.transaction;
  if (!txn) return { handled: false, message: "Payload sin transaction" };
  if (txn.status !== "APPROVED") {
    return { handled: false, message: `Estado ${txn.status} ignorado (se espera APPROVED)` };
  }
  // TODO(producción): buscar la transacción pendiente por referencia y
  // acreditar el depósito en la billetera del usuario.
  logger.info(`[webhook] Depósito aprobado ${txn.id} por ${txn.amount_in_cents / 100} ${txn.currency}`);
  return { handled: true, message: "Depósito aprobado registrado" };
}
