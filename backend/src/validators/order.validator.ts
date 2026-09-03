/* Validadores de órdenes de trading — BANCA NEN */
import Joi from "joi";

export const createOrderSchema = Joi.object({
  symbol: Joi.string().min(1).max(20).required(),
  type: Joi.string()
    .valid("market", "limit", "stop_loss", "take_profit", "stop_limit", "trailing_stop")
    .required(),
  side: Joi.string().valid("buy", "sell").required(),
  quantity: Joi.number().positive().required(),
  price: Joi.number().positive().optional(),
  stopPrice: Joi.number().positive().optional(),
});
