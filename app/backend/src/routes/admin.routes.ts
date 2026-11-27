import { Router } from "express";
import { authenticate, authorize, requireStaffMfa } from "../middleware/auth.middleware";
import { validate, validateQuery } from "../middleware/validation.middleware";
import { UserRole } from "../models/User";
import { auditQuery, changeStatusSchema, changeRoleSchema, chartQuery, saveSettingsSchema, usersQuery } from "../validators/admin.validator";
import * as controller from "../controllers/admin.controller";

const router = Router();
const { ADMIN, OPERATOR, ANALYST, COMPLIANCE } = UserRole;
router.use(authenticate, authorize(ADMIN, OPERATOR, ANALYST, COMPLIANCE), requireStaffMfa);
router.get("/users", authorize(ADMIN, OPERATOR), validateQuery(usersQuery), controller.listUsers);
router.patch("/users/:id/status", authorize(ADMIN), validate(changeStatusSchema), controller.changeUserStatus);
router.patch("/users/:id/role", authorize(ADMIN), validate(changeRoleSchema), controller.changeUserRole);
router.get("/audit", authorize(ADMIN, COMPLIANCE), validateQuery(auditQuery), controller.listAuditLogs);
router.get("/audit/integrity", authorize(ADMIN, COMPLIANCE), controller.auditIntegrity);
router.get("/stats", controller.getStats);
router.get("/chart", validateQuery(chartQuery), controller.getChartData);
router.get("/settings", authorize(ADMIN), controller.getSettings);
router.put("/settings", authorize(ADMIN), validate(saveSettingsSchema), controller.saveSettings);

export default router;
