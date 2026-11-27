/* Controlador de Webhooks (Wompi) — BANCA NEN */
import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler.middleware";
import {
  verifyWompiChecksum,
  logWebhook,
  markWebhook,
  processWompiEvent,
} from "../services/webhook.service";
import { WebhookStatus } from "../models/WebhookLog";

export async function wompiWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const event = req.body?.event as string | undefined;
    const data = req.body?.data as any;
    const checksum = (req.headers["x-event-checksum"] as string) || "";
    const secret = process.env.WOMPI_EVENTS_SECRET || "";

    // 1. Registrar el evento (trazabilidad)
    const log = await logWebhook("wompi", event || "unknown", req.body, checksum);

    if (!event) {
      await markWebhook(log.id, WebhookStatus.FAILED, "Falta el campo event");
      throw new AppError("Evento invalido", 400);
    }

    // 2. Verificar firma si hay secret configurado
    if (secret) {
      const txn = data?.transaction;
      const amount = Number(txn?.amount_in_cents ?? 0);
      const valid = txn
        ? verifyWompiChecksum(String(txn.id), String(txn.status), amount, checksum, secret)
        : false;
      if (!valid) {
        await markWebhook(log.id, WebhookStatus.FAILED, "Firma invalida");
        throw new AppError("Firma del webhook invalida", 401);
      }
    }

    // 3. Procesar
    const result = await processWompiEvent(event, data);
    await markWebhook(
      log.id,
      result.handled ? WebhookStatus.PROCESSED : WebhookStatus.IGNORED
    );

    res.status(200).json({ received: true, ...result });
  } catch (err) { next(err); }
}
