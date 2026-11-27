/* Validadores de perfil y preferencias — BANCA NEN */
import Joi from "joi";

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(100).optional(),
  lastName: Joi.string().trim().min(2).max(100).optional(),
  country: Joi.string().length(2).optional(),
  timezone: Joi.string().max(50).optional(),
  preferredCurrency: Joi.string().valid("USD", "COP", "EUR").optional(),
});

export const updateSettingsSchema = Joi.object({
  theme: Joi.string().valid("dark", "light").optional(),
  language: Joi.string().valid("es", "en").optional(),
  currencyDisplay: Joi.string().valid("USD", "COP", "EUR").optional(),
  emailNotifications: Joi.boolean().optional(),
  pushNotifications: Joi.boolean().optional(),
  smsNotifications: Joi.boolean().optional(),
  tradingConfirmations: Joi.boolean().optional(),
  riskTolerance: Joi.string().valid("conservative", "moderate", "aggressive").optional(),
  hideSmallBalances: Joi.boolean().optional(),
});
