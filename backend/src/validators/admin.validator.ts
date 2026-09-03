/* Validadores del panel de administración — BANCA NEN */
import Joi from "joi";

export const changeStatusSchema = Joi.object({
  status: Joi.string().valid("active", "suspended", "blocked").required(),
});

export const changeRoleSchema = Joi.object({
  role: Joi.string().valid("user", "analyst", "operator", "admin", "compliance").required(),
});

export const saveSettingsSchema = Joi.object({
  platformName: Joi.string().max(100).optional(),
  maintenanceMode: Joi.boolean().optional(),
  allowRegistration: Joi.boolean().optional(),
  kycRequired: Joi.boolean().optional(),
  defaultCurrency: Joi.string().valid("USD", "COP", "EUR").optional(),
  tradingFee: Joi.number().min(0).optional(),
  withdrawalFee: Joi.number().min(0).optional(),
  minWithdrawal: Joi.number().min(0).optional(),
  minDeposit: Joi.number().min(0).optional(),
  twoFactorRequired: Joi.boolean().optional(),
  sessionTimeoutMin: Joi.number().integer().min(1).optional(),
}).unknown(true);
