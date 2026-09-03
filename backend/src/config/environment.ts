/* Configuración centralizada del entorno — BANCA NEN */

const env = (k: string, d = "") => (process.env[k] ?? d).trim();

export const environment = {
  nodeEnv: env("NODE_ENV", "development"),
  isProduction: env("NODE_ENV", "development") === "production",
  isTest: env("NODE_ENV", "development") === "test",
  port: parseInt(env("PORT", "3000"), 10),
  host: env("HOST", "0.0.0.0"),
  frontendUrl: env("FRONTEND_URL", "http://localhost:5173").replace(/\/+$/, ""),
  apiPrefix: "/api/v1",
};
