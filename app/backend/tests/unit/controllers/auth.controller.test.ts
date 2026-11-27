import { describe, expect, it, vi } from "vitest";
vi.mock("../../../src/services/auth.service", () => ({ registerUser: vi.fn(), loginUser: vi.fn(), getProfile: vi.fn() }));
import * as auth from "../../../src/services/auth.service";
import { getProfile, login, register } from "../../../src/controllers/auth.controller";

function response() {
  const res = { status: vi.fn(), json: vi.fn(), cookie: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}
const req = { get: vi.fn().mockReturnValue("Prueba/1.0"), ip: "127.0.0.1", body: { email: "ana@example.com" } } as any;

describe("controlador auth", () => {
  it("emite credenciales solo en cookies HttpOnly, SameSite=Strict y con alcance de ruta", async () => {
    vi.mocked(auth.registerUser).mockResolvedValue({ user: { id: "p1" }, credentials: {
      access: "acceso-fixture", refresh: "renovacion-fixture", expiresAt: new Date(Date.now() + 1_000_000),
    }, needsVerification: true } as any);
    const res = response();
    await register(req, res as any);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ status: "success", data: { user: { id: "p1" }, needsVerification: true } });
    expect(res.cookie).toHaveBeenCalledWith("nen_access", "acceso-fixture", expect.objectContaining({ httpOnly: true, sameSite: "strict", path: "/api/v1" }));
    expect(res.cookie).toHaveBeenCalledWith("nen_refresh", "renovacion-fixture", expect.objectContaining({ httpOnly: true, sameSite: "strict", path: "/api/v1/auth" }));
  });
  it("el primer paso de login 2FA no emite cookies", async () => {
    vi.mocked(auth.loginUser).mockResolvedValue({ requiresTwoFactor: true });
    const res = response();
    await login(req, res as any);
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ status: "success", data: { requiresTwoFactor: true } });
  });
  it("exige identidad autenticada para solicitar perfil", async () => {
    await expect(getProfile(req, response() as any)).rejects.toMatchObject({ statusCode: 401 });
  });
});
