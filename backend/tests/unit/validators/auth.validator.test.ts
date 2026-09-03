// Pruebas unitarias de los esquemas de validación Joi de autenticación.
import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  verifyCodeSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../../../src/validators/auth.validator";

const usuarioValido = {
  email: "ana.perez@example.com",
  firstName: "Ana",
  lastName: "Pérez",
  documentType: "cc",
  documentNumber: "123456789",
  dateOfBirth: "1990-05-10",
  phone: "+573001234567",
  password: "Segura123",
};

describe("registerSchema", () => {
  it("acepta un registro válido", () => {
    const { error } = registerSchema.validate(usuarioValido);
    expect(error).toBeUndefined();
  });

  it("rechaza un email inválido", () => {
    const { error } = registerSchema.validate({ ...usuarioValido, email: "no-es-un-email" });
    expect(error).toBeDefined();
  });

  it("rechaza una contraseña débil (sin mayúscula)", () => {
    const { error } = registerSchema.validate({ ...usuarioValido, password: "todominuscula1" });
    expect(error).toBeDefined();
  });

  it("rechaza un tipo de documento no permitido", () => {
    const { error } = registerSchema.validate({ ...usuarioValido, documentType: "ti" });
    expect(error).toBeDefined();
  });

  it("rechaza un teléfono con formato inválido", () => {
    const { error } = registerSchema.validate({ ...usuarioValido, phone: "abc" });
    expect(error).toBeDefined();
  });
});

describe("loginSchema", () => {
  it("acepta email + contraseña sin 2FA", () => {
    const { error } = loginSchema.validate({ email: "a@b.co", password: "x" });
    expect(error).toBeUndefined();
  });

  it("acepta un código 2FA de 6 dígitos opcional", () => {
    const { error } = loginSchema.validate({ email: "a@b.co", password: "x", twoFactorCode: "123456" });
    expect(error).toBeUndefined();
  });

  it("rechaza un código 2FA de longitud distinta a 6", () => {
    const { error } = loginSchema.validate({ email: "a@b.co", password: "x", twoFactorCode: "12345" });
    expect(error).toBeDefined();
  });
});

describe("verifyCodeSchema", () => {
  it("exige un código de 6 dígitos", () => {
    expect(verifyCodeSchema.validate({ code: "123456" }).error).toBeUndefined();
    expect(verifyCodeSchema.validate({ code: "12" }).error).toBeDefined();
    expect(verifyCodeSchema.validate({}).error).toBeDefined();
  });
});

describe("forgotPasswordSchema", () => {
  it("exige un email válido", () => {
    expect(forgotPasswordSchema.validate({ email: "a@b.co" }).error).toBeUndefined();
    expect(forgotPasswordSchema.validate({ email: "nope" }).error).toBeDefined();
  });
});

describe("resetPasswordSchema", () => {
  it("exige token y contraseña segura", () => {
    expect(resetPasswordSchema.validate({ token: "123456", password: "Nueva1234" }).error).toBeUndefined();
    expect(resetPasswordSchema.validate({ token: "1", password: "Nueva1234" }).error).toBeDefined();
    expect(resetPasswordSchema.validate({ token: "123456", password: "debil" }).error).toBeDefined();
  });
});
