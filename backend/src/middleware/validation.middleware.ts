import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "joi";
import { AppError } from "./errorHandler.middleware";

export const validate = (schema: ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map((d) => d.message).join(", ");
      next(new AppError(messages, 400));
      return;
    }
    next();
  };
};
