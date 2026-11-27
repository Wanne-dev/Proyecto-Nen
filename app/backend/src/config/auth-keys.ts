import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, randomUUID } from "node:crypto";
import { linkSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

let key: Buffer | undefined;
const FORMAT = /^[a-f0-9]{64}$/i;
const parse = (value: string) => {
  if (!FORMAT.test(value)) throw new Error("ENCRYPTION_KEY debe contener 32 bytes codificados como 64 dígitos hexadecimales.");
  return Buffer.from(value, "hex");
};

/** Clave independiente del JWT. En la instalación local persiste en un archivo privado local. */
export function authKey(): Buffer {
  if (key) return key;
  const configured = process.env.ENCRYPTION_KEY?.trim();
  if (configured) {
    if (configured.toLowerCase() === process.env.JWT_SECRET?.trim().toLowerCase()) {
      throw new Error("ENCRYPTION_KEY debe ser distinta de JWT_SECRET.");
    }
    return (key = parse(configured));
  }
  if (process.env.NODE_ENV === "production") throw new Error("Falta ENCRYPTION_KEY; configura una clave distinta del JWT para staging.");
  if (process.env.NODE_ENV === "test") return (key = randomBytes(32));

  const path = resolve(process.env.AUTH_KEY_FILE || ".local/nen-auth.key");
  try {
    return (key = parse(readFileSync(path, "utf8").trim()));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(tmp, randomBytes(32).toString("hex"), { mode: 0o600, flag: "wx" });
    try { linkSync(tmp, path); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  } finally {
    try { unlinkSync(tmp); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return (key = parse(readFileSync(path, "utf8").trim()));
}

export function keyFor(purpose: "totp" | "verification"): Buffer {
  return Buffer.from(hkdfSync("sha256", authKey(), Buffer.alloc(0), `banca-nen/auth/v1/${purpose}`, 32));
}

export function sealTotp(secret: string, userId: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFor("totp"), iv);
  cipher.setAAD(Buffer.from(userId));
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function unsealTotp(value: string, userId: string): string {
  const [version, iv, tag, ciphertext] = value.split(".");
  if (version !== "v1" || !iv || !tag || !ciphertext) throw new Error("Formato de TOTP no reconocido.");
  const decipher = createDecipheriv("aes-256-gcm", keyFor("totp"), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(userId));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
