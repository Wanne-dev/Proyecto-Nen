// Pruebas de las utilidades de cifrado (AES-256-GCM, SHA-256).
import { describe, it, expect } from "vitest";
import { encryptAES, decryptAES, sha256, randomToken, randomCode } from "../../../src/utils/crypto";

describe("utils/crypto", () => {
  it("cifra y descifra un texto (round-trip)", () => {
    const secret = "clave-secreta-de-prueba";
    const original = "documento-123456";
    const encrypted = encryptAES(original, secret);
    expect(encrypted).not.toContain(original);
    expect(decryptAES(encrypted, secret)).toBe(original);
  });

  it("genera texto cifrado distinto cada vez (IV aleatorio)", () => {
    const a = encryptAES("mismo texto", "secret");
    const b = encryptAES("mismo texto", "secret");
    expect(a).not.toBe(b);
  });

  it("lanza error al descifrar con clave incorrecta", () => {
    const encrypted = encryptAES("secreto", "clave-1");
    expect(() => decryptAES(encrypted, "clave-2")).toThrow();
  });

  it("sha256 devuelve 64 caracteres hex y es determinista", () => {
    const h = sha256("data");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256("data")).toBe(h);
  });

  it("randomToken y randomCode respetan su tamaño", () => {
    expect(randomToken(16)).toHaveLength(32); // 16 bytes -> 32 hex
    expect(randomCode(6)).toMatch(/^\d{6}$/);
  });
});
