/* Logging de peticiones HTTP (morgan) — BANCA NEN */
import morgan from "morgan";

export const loggerMiddleware = morgan("dev");
