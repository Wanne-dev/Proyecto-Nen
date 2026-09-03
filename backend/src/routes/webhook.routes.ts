/* ============================================================
   BANCA NEN — Rutas de Webhooks (entrada de proveedores)
   POST /v1/webhooks/wompi  → eventos de Wompi (sin autenticación,
                              se validan por firma X-Event-Checksum)
   ============================================================ */
import { Router } from "express";
import { wompiWebhook } from "../controllers/webhook.controller";

const router = Router();

router.post("/wompi", wompiWebhook);

export default router;
