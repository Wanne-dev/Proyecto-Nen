/* Validadores de billetera — BANCA NEN */
import Joi from "joi";

export const depositSchema = Joi.object({
  currency: Joi.string().valid("USD", "COP", "EUR", "BTC", "ETH", "USDC").required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().max(500).optional(),
});

export const withdrawSchema = Joi.object({
  currency: Joi.string().valid("USD", "COP", "EUR", "BTC", "ETH", "USDC").required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().max(500).optional(),
});
