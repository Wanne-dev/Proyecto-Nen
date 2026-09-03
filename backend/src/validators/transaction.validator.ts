/* Validadores de consulta de transacciones — BANCA NEN */
import Joi from "joi";

export const listTransactionsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  type: Joi.string()
    .valid("deposit", "withdrawal", "transfer_in", "transfer_out", "trade_buy", "trade_sell", "fee", "refund")
    .optional(),
  days: Joi.number().integer().min(1).max(365).optional(),
});
