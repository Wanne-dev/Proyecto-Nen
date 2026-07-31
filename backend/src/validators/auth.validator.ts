import Joi from "joi";

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "El email no es valido",
    "any.required": "El email es requerido",
  }),
  firstName: Joi.string().min(2).max(100).required().messages({
    "string.min": "El nombre debe tener al menos 2 caracteres",
    "any.required": "El nombre es requerido",
  }),
  lastName: Joi.string().min(2).max(100).required().messages({
    "string.min": "El apellido debe tener al menos 2 caracteres",
    "any.required": "El apellido es requerido",
  }),
  documentType: Joi.string().valid("cc", "ce", "pasaporte").required().messages({
    "any.only": "Tipo de documento invalido (cc, ce, pasaporte)",
    "any.required": "El tipo de documento es requerido",
  }),
  documentNumber: Joi.string().min(5).max(50).required().messages({
    "string.min": "Numero de documento invalido",
    "any.required": "El numero de documento es requerido",
  }),
  dateOfBirth: Joi.string().isoDate().required().messages({
    "string.isoDate": "Fecha de nacimiento invalida (formato: YYYY-MM-DD)",
    "any.required": "La fecha de nacimiento es requerida",
  }),
  phone: Joi.string().pattern(/^\+?[1-9]\d{6,14}$/).required().messages({
    "string.pattern.base": "Numero de telefono invalido (formato: +573001234567)",
    "any.required": "El telefono es requerido",
  }),
  password: Joi.string().min(8).max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      "string.min": "La contrasena debe tener al menos 8 caracteres",
      "string.pattern.base": "La contrasena debe tener mayuscula, minuscula y numero",
      "any.required": "La contrasena es requerida",
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "El email no es valido",
    "any.required": "El email es requerido",
  }),
  password: Joi.string().required().messages({
    "any.required": "La contrasena es requerida",
  }),
  twoFactorCode: Joi.string().length(6).pattern(/^\d+$/).optional().messages({
    "string.length": "El codigo 2FA debe tener 6 digitos",
  }),
});

export const verifyCodeSchema = Joi.object({
  code: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    "string.length": "El codigo debe tener 6 digitos",
    "any.required": "El codigo es requerido",
  }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "El email no es valido",
    "any.required": "El email es requerido",
  }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "El token es requerido",
  }),
  password: Joi.string().min(8).max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      "string.min": "La contrasena debe tener al menos 8 caracteres",
      "string.pattern.base": "La contrasena debe tener mayuscula, minuscula y numero",
      "any.required": "La contrasena es requerida",
    }),
});
