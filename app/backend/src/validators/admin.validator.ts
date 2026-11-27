import Joi from "joi";
import { AccountStatus, UserRole } from "../models/User";

export const changeStatusSchema = Joi.object({
  status: Joi.string().valid(AccountStatus.ACTIVE, AccountStatus.SUSPENDED, AccountStatus.BLOCKED).required(),
});
export const changeRoleSchema = Joi.object({ role: Joi.string().valid(...Object.values(UserRole)).required() });
export const saveSettingsSchema = Joi.object({ allowRegistration: Joi.boolean().strict().required() });
const page = { page: Joi.number().integer().min(1).max(1000), limit: Joi.number().integer().min(1).max(100) };
const search = Joi.string().trim().allow("").max(100);
export const usersQuery = Joi.object({ ...page, search, role: Joi.string().valid("all", ...Object.values(UserRole)), status: Joi.string().valid("all", ...Object.values(AccountStatus)) });
export const auditQuery = Joi.object({ ...page, search, category: Joi.string().max(50), severity: Joi.string().valid("all", "info", "warning", "danger") });
export const chartQuery = Joi.object({ range: Joi.string().valid("7d", "30d", "90d") });
