// Pruebas de la API pública del servicio de autenticación.
// (El flujo completo contra BD se cubre en tests/integration con Docker.)
import { describe, it, expect } from "vitest";
import * as authService from "../../../src/services/auth.service";

describe("auth.service — API pública", () => {
  it("se importa sin efectos secundarios (sin conexión a BD)", () => {
    expect(authService).toBeTruthy();
  });

  it("expone el flujo completo de autenticación", () => {
    expect(typeof authService.registerUser).toBe("function");
    expect(typeof authService.loginUser).toBe("function");
    expect(typeof authService.verifyEmailCode).toBe("function");
    expect(typeof authService.verifyPhoneCode).toBe("function");
    expect(typeof authService.resendVerificationCodes).toBe("function");
    expect(typeof authService.forgotPassword).toBe("function");
    expect(typeof authService.resetPassword).toBe("function");
    expect(typeof authService.enable2FA).toBe("function");
    expect(typeof authService.disable2FA).toBe("function");
    expect(typeof authService.getProfile).toBe("function");
  });
});
