/* ============================================================
   BANCA NEN — Rutas de Administración (roles admin/operator/analyst)
   GET    /v1/admin/users                 → listar usuarios (filtros)
   PATCH  /v1/admin/users/:id/status      → cambiar estado
   PATCH  /v1/admin/users/:id/role        → cambiar rol
   GET    /v1/admin/audit                 → auditoría inmutable
   GET    /v1/admin/stats                 → KPIs del sistema
   GET    /v1/admin/chart?range=7d|30d|90d
   GET    /v1/admin/settings              → configuración del sistema
   PUT    /v1/admin/settings              → guardar configuración
   ============================================================ */
import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { UserRole } from "../models/User";
import {
  listUsers, changeUserStatus, changeUserRole, listAuditLogs,
  getStats, getChartData, getSettings, saveSettings,
} from "../controllers/admin.controller";

const router = Router();

const staffRoles = [UserRole.ADMIN, UserRole.OPERATOR, UserRole.ANALYST];

router.use(authenticate, authorize(...staffRoles));

router.get("/users", listUsers);
router.patch("/users/:id/status", changeUserStatus);
router.patch("/users/:id/role", changeUserRole);
router.get("/audit", listAuditLogs);
router.get("/stats", getStats);
router.get("/chart", getChartData);
router.get("/settings", getSettings);
router.put("/settings", saveSettings);

export default router;
