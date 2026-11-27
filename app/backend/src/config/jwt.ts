import { randomBytes } from "node:crypto";

const configuredSecret = process.env.JWT_SECRET?.trim();

// La instalación local puede arrancar sin recibir una clave. Se genera una distinta
// por proceso. Al reiniciar, las sesiones aún vigentes pueden renovar su acceso.
// En producción no se acepta un valor conocido ni una clave corta.
if (process.env.NODE_ENV === "production" &&
    (!configuredSecret || Buffer.byteLength(configuredSecret) < 32 ||
      /^(?:change|replace|cambia|reemplaza|example|placeholder)/i.test(configuredSecret))) {
  throw new Error("JWT_SECRET debe ser un secreto aleatorio de al menos 32 bytes en producción.");
}

export const JWT_SECRET = configuredSecret || randomBytes(48).toString("base64url");
// Límites de sesión: 15 min de acceso, máximo siete días por sesión.
export const ACCESS_TTL_SECONDS = 15 * 60;
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
