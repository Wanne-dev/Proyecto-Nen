/* Utilidades de JWT — BANCA NEN */
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/jwt";

export interface TokenPayload {
  id: string;
  role: string;
  [key: string]: unknown;
}

export function signToken(payload: TokenPayload, expiresIn?: string): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: (expiresIn || JWT_EXPIRES_IN) as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken<T = TokenPayload>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}

export function decodeToken<T = TokenPayload>(token: string): T | null {
  try {
    return jwt.decode(token) as T | null;
  } catch {
    return null;
  }
}
