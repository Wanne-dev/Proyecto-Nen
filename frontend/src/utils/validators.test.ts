import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isValidDocument,
  isValidAmount,
  isValidCode6,
  isStrongPassword,
} from "./validators";

describe("validators", () => {
  it("isValidEmail acepta emails válidos y rechaza inválidos", () => {
    expect(isValidEmail("ana@example.com")).toBe(true);
    expect(isValidEmail("no-es-email")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
  });

  it("isValidPassword exige al menos 8 caracteres", () => {
    expect(isValidPassword("12345678")).toBe(true);
    expect(isValidPassword("corto")).toBe(false);
  });

  it("isValidPhone acepta formatos comunes", () => {
    expect(isValidPhone("+573001234567")).toBe(true);
    expect(isValidPhone("300 123 4567")).toBe(true);
    expect(isValidPhone("abc")).toBe(false);
  });

  it("isValidDocument valida números de 6 a 12 dígitos", () => {
    expect(isValidDocument("123456789")).toBe(true);
    expect(isValidDocument("12")).toBe(false);
  });

  it("isValidAmount valida números positivos", () => {
    expect(isValidAmount(100)).toBe(true);
    expect(isValidAmount("50.5")).toBe(true);
    expect(isValidAmount(-1)).toBe(false);
    expect(isValidAmount("no-numero")).toBe(false);
  });

  it("isValidCode6 exige exactamente 6 dígitos", () => {
    expect(isValidCode6("123456")).toBe(true);
    expect(isValidCode6("12345")).toBe(false);
    expect(isValidCode6("abcdef")).toBe(false);
  });

  it("isStrongPassword evalúa longitud, mayúsculas, minúsculas, números y especiales", () => {
    expect(isStrongPassword("Segura123!").valid).toBe(true);
    expect(isStrongPassword("debil").valid).toBe(false);
    const r = isStrongPassword("Abcdefg1");
    expect(r.checks.length).toBe(true);
    expect(r.checks.upper).toBe(true);
    expect(r.checks.lower).toBe(true);
    expect(r.checks.number).toBe(true);
    expect(r.checks.special).toBe(false);
  });
});
