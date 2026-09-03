/* Configuración de JWT — BANCA NEN */

const env = (k: string, d = "") => (process.env[k] ?? d).trim();

export const JWT_SECRET = env("JWT_SECRET") || "fallback-secret-cambiar-en-produccion";
export const JWT_EXPIRES_IN = env("JWT_EXPIRES_IN") || "24h";
export const JWT_REFRESH_EXPIRES_IN = env("JWT_REFRESH_EXPIRES_IN") || "7d";
