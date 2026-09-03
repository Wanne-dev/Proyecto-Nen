// Pruebas de las utilidades JWT (firma/verificación).
import { describe, it, expect } from "vitest";
import { signToken, verifyToken, decodeToken } from "../../../src/utils/jwt";

describe("utils/jwt", () => {
  const payload = { id: "user-1", role: "user" };

  it("firma y verifica un token", () => {
    const token = signToken(payload);
    expect(typeof token).toBe("string");
    const decoded = verifyToken<typeof payload>(token);
    expect(decoded.id).toBe("user-1");
    expect(decoded.role).toBe("user");
  });

  it("decodifica sin verificar", () => {
    const token = signToken(payload);
    const decoded = decodeToken<typeof payload>(token);
    expect(decoded?.id).toBe("user-1");
  });

  it("rechaza tokens inválidos", () => {
    expect(() => verifyToken("token-invalido")).toThrow();
  });
});
