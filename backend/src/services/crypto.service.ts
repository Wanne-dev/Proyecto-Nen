/* Servicio de cifrado de la aplicación — BANCA NEN
 * Envuelve utils/crypto con la clave de cifrado del entorno.
 */
import { encryptAES, decryptAES, sha256, randomToken } from "../utils/crypto";
import { JWT_SECRET } from "../config/jwt";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || JWT_SECRET;

export const encrypt = (text: string): string => encryptAES(text, ENCRYPTION_KEY);

export const decrypt = (payload: string): string => decryptAES(payload, ENCRYPTION_KEY);

export const hash = (text: string): string => sha256(text);

export const generateToken = (bytes = 32): string => randomToken(bytes);
