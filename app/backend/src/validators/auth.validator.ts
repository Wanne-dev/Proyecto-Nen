import Joi from "joi";

const email = Joi.string().trim().lowercase().max(254).email();
const existingPassword = Joi.string().max(72, "utf8");
const newPassword = Joi.string().min(8).max(72, "utf8").pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).messages({
  "string.min": "La contraseña debe tener al menos 8 caracteres",
  "string.max": "La contraseña no puede superar 72 bytes",
  "string.pattern.base": "La contraseña debe incluir mayúscula, minúscula y número",
});
const sixDigits = Joi.string().pattern(/^\d{6}$/).messages({ "string.pattern.base": "El código debe tener 6 dígitos" });

export const registerSchema = Joi.object({
  email: email.required(),
  firstName: Joi.string().trim().min(2).max(100).required(),
  lastName: Joi.string().trim().min(2).max(100).required(),
  documentType: Joi.string().valid("cc", "ce", "pasaporte", "passport").required(),
  documentNumber: Joi.string().trim().min(5).max(50).required(),
  dateOfBirth: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value, helper) => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : helper.error("string.isoDate");
  }).required(),
  phone: Joi.string().trim().pattern(/^\+?[1-9]\d{6,14}$/).required(),
  password: newPassword.required(),
});
export const loginSchema = Joi.object({ email: email.required(), password: existingPassword.required(), twoFactorCode: sixDigits });
export const verifyCodeSchema = Joi.object({ code: sixDigits.required() });
export const forgotPasswordSchema = Joi.object({ email: email.required() });
export const resetPasswordSchema = Joi.object({
  token: Joi.string().pattern(/^(?:\d{6}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.[\w-]{43})$/i).required(),
  email: Joi.when("token", { is: Joi.string().pattern(/^\d{6}$/).required(), then: email.required(), otherwise: email.optional() }),
  password: newPassword.required(),
});
export const setupTwoFactorSchema = Joi.object({ password: existingPassword.required() });
export const disableTwoFactorSchema = Joi.object({ password: existingPassword.required(), code: sixDigits.required() });
export const changePasswordSchema = Joi.object({ currentPassword: existingPassword.required(), password: newPassword.required(), code: sixDigits });
