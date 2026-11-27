import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { JWT_SECRET } from "../../../src/config/jwt";
import { signAccessToken, verifyAccessToken } from "../../../src/utils/jwt";

const claims = { userId: randomUUID(), sessionId: randomUUID(), scope: "access" as const };
const options = { issuer: "banca-nen", audience: "banca-nen-api", subject: claims.userId, expiresIn: "5m" as const };

describe("JWT de acceso ligado a una sesión", () => {
  it("acepta solo el propósito y alcance firmados; no contiene un rol", () => {
    const token = signAccessToken(claims);
    expect(verifyAccessToken(token)).toEqual(claims);
    expect(jwt.decode(token)).not.toHaveProperty("role");
    expect(verifyAccessToken(signAccessToken({ ...claims, scope: "verify" })).scope).toBe("verify");
  });
  it("rechaza JWT anteriores, un JWT de otro propósito y una audiencia distinta", () => {
    expect(() => verifyAccessToken(jwt.sign({ id: claims.userId, role: "user" }, JWT_SECRET))).toThrow();
    expect(() => verifyAccessToken(jwt.sign({ kind: "refresh", sid: claims.sessionId, scope: "access" }, JWT_SECRET, options))).toThrow();
    expect(() => verifyAccessToken(jwt.sign({ kind: "session-access", sid: claims.sessionId, scope: "access" }, JWT_SECRET, { ...options, audience: "otra-api" }))).toThrow();
  });
  it("rechaza acceso vencido, firma incorrecta y algoritmo diferente", () => {
    const payload = { kind: "session-access", sid: claims.sessionId, scope: "access" };
    expect(() => verifyAccessToken(jwt.sign(payload, JWT_SECRET, { ...options, expiresIn: -1 }))).toThrow();
    expect(() => verifyAccessToken(jwt.sign(payload, "clave-ajena-para-pruebas", options))).toThrow();
    expect(() => verifyAccessToken(jwt.sign(payload, JWT_SECRET, { ...options, algorithm: "HS384" }))).toThrow();
    expect(() => verifyAccessToken("no-es-un-jwt")).toThrow();
  });
});
