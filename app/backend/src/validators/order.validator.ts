import Joi from "joi";
import { VIRTUAL_TRADE_ASSETS } from "../services/virtual-quotes";

export const createOrderSchema = Joi.object({
  symbol: Joi.string().uppercase().valid(...VIRTUAL_TRADE_ASSETS).required(),
  type: Joi.string().valid("market").required().messages({ "any.only": "Solo se admiten órdenes simuladas de mercado" }),
  side: Joi.string().valid("buy", "sell").required(),
  quantity: Joi.number().strict().positive().max(100_000_000).required(),
  // Clientes anteriores lo envían. El controlador no lo usa para la ejecución.
  price: Joi.number().positive().optional(),
});
