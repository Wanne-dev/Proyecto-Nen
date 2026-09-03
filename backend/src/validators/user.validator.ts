/* Validadores de perfil y preferencias — BANCA NEN */
import Joi from "joi";

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(100).optional(),
  lastName: Joi.string().min(2).max(100).optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{6,14}$/).optional(),
  country: Joi.string().length(2).optional(),
  timezone: Joi.string().max(50).optional(),
  preferredCurrency: Joi.string().valid("USD", "COP", "EUR").optional(),
  dateOfBirth: Joi.string().isoDate().optional(),
});

export const updateSettingsSchema = Joi.object({
  theme: Joi.string().valid("dark", "light").optional(),
  language: Joi.string().valid("es", "en").optional(),
  currencyDisplay: Joi.string().valid("USD", "COP", "EUR").optional(),
  emailNotifications: Joi.boolean().optional(),
  pushNotifications: Joi.boolean().optional(),
  smsNotifications: Joi.boolean().optional(),
  twoFactorMethod: Joi.string().valid("email", "sms", "totp").optional(),
  biometricEnabled: Joi.boolean().optional(),
  tradingConfirmations: Joi.boolean().optional(),
  riskTolerance: Joi.string().valid("conservative", "moderate", "aggressive").optional(),
  autoLogoutMinutes: Joi.number().integer().min(1).max(1440).optional(),
  hideSmallBalances: Joi.boolean().optional(),
});
