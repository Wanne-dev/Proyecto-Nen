/* Servicio de cifrado de la aplicación — BANCA NEN
 * Envuelve utils/crypto con la clave de cifrado del entorno.
 */
import { encryptAES, decryptAES, sha256, randomToken } from "../utils/crypto";
import { authKey } from "../config/auth-keys";

export const encrypt = (text: string): string => encryptAES(text, authKey().toString("hex"));

export const decrypt = (payload: string): string => decryptAES(payload, authKey().toString("hex"));

export const hash = (text: string): string => sha256(text);

export const generateToken = (bytes = 32): string => randomToken(bytes);
