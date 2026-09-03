// Pruebas unitarias del controlador de autenticación (servicios mockeados).
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../src/services/auth.service", () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  verifyEmailCode: vi.fn(),
  verifyPhoneCode: vi.fn(),
  resendVerificationCodes: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  enable2FA: vi.fn(),
  disable2FA: vi.fn(),
  getProfile: vi.fn(),
}));

vi.mock("../../../src/services/audit.service", () => ({
  logAudit: vi.fn().mockResolvedValue({}),
  listAudit: vi.fn(),
}));

import * as authService from "../../../src/services/auth.service";
import { register, login, getProfile } from "../../../src/controllers/auth.controller";

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("auth.controller (servicios mockeados)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("register responde 201 con status success", async () => {
    (authService.registerUser as any).mockResolvedValue({ user: { id: "u-1" } });
    const req: any = { body: { email: "ana@example.com" }, ip: "127.0.0.1" };
    const res = mockRes();
    const next = vi.fn();

    await register(req, res, next);

    expect(authService.registerUser).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "success" }));
    expect(next).not.toHaveBeenCalled();
  });

  it("login delega los errores al middleware next()", async () => {
    (authService.loginUser as any).mockRejectedValue(new Error("credenciales inválidas"));
    const req: any = { body: { email: "ana@example.com" }, ip: "127.0.0.1" };
    const res = mockRes();
    const next = vi.fn();

    await login(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });

  it("getProfile exige usuario autenticado (AppError 401)", async () => {
    const req: any = { user: undefined };
    const res = mockRes();
    const next = vi.fn();

    await getProfile(req, res, next);

    expect(next).toHaveBeenCalled();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
  });
});
