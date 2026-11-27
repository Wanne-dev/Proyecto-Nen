import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { ACCESS_TTL_SECONDS, JWT_SECRET } from "../config/jwt";
import type { SessionScope } from "../models/UserSession";

const issuer = "banca-nen";
const audience = "banca-nen-api";
export const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export interface AccessClaims { userId: string; sessionId: string; scope: SessionScope }

export function signAccessToken({ userId, sessionId, scope }: AccessClaims): string {
  return jwt.sign({ kind: "session-access", sid: sessionId, scope }, JWT_SECRET, {
    algorithm: "HS256", issuer, audience, subject: userId, jwtid: randomUUID(), expiresIn: ACCESS_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessClaims {
  const claims = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"], issuer, audience });
  if (typeof claims === "string" || claims.kind !== "session-access" ||
    typeof claims.sub !== "string" || !UUID.test(claims.sub) ||
    typeof claims.sid !== "string" || !UUID.test(claims.sid) ||
    (claims.scope !== "access" && claims.scope !== "verify") || typeof claims.exp !== "number") {
    throw new Error("Credencial de sesión inválida");
  }
  return { userId: claims.sub, sessionId: claims.sid, scope: claims.scope };
}
