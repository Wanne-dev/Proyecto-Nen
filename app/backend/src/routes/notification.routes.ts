/* ============================================================
   BANCA NEN — Rutas de Notificaciones
   GET   /v1/notifications             → listar del usuario
   POST  /v1/notifications/:id/read    → marcar como leída
   POST  /v1/notifications/read-all    → marcar todas como leídas
   ============================================================ */
import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { listNotifications, markAsRead, markAllAsRead } from "../controllers/notification.controller";

const router = Router();

router.use(authenticate);

router.get("/", listNotifications);
router.post("/read-all", markAllAsRead);
router.post("/:id/read", markAsRead);

export default router;
