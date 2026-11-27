import { Router } from "express";

const router = Router();
// Esta entrega no integra una pasarela. No persistir eventos ni aceptar desembolsos.
router.post("/wompi", (_req, res) => {
  res.status(503).json({ status: "error", message: "Wompi no está habilitado en esta entrega" });
});
export default router;
