// Pruebas de integración del API de billetera (sin base de datos):
// verifican que las rutas protegidas exigen autenticación.
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../src/app";

describe("API /api/v1/wallet — requiere autenticación", () => {
  it("rechaza GET /api/v1/wallet sin token (401)", async () => {
    const res = await request(app).get("/api/v1/wallet");
    expect(res.status).toBe(401);
  });

  it("rechaza GET /api/v1/wallet/balances sin token (401)", async () => {
    const res = await request(app).get("/api/v1/wallet/balances");
    expect(res.status).toBe(401);
  });

  it("rechaza POST /api/v1/wallet/deposit sin token (401)", async () => {
    const res = await request(app).post("/api/v1/wallet/deposit").send({ currency: "USD", amount: 10 });
    expect(res.status).toBe(401);
  });

  it("rechaza POST /api/v1/wallet/withdraw sin token (401)", async () => {
    const res = await request(app).post("/api/v1/wallet/withdraw").send({ currency: "USD", amount: 10 });
    expect(res.status).toBe(401);
  });
});
