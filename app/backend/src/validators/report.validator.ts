/* Validadores de reportes — BANCA NEN */
import Joi from "joi";

export const reportQuerySchema = Joi.object({
  range: Joi.string().valid("7d", "30d", "90d").optional(),
});
