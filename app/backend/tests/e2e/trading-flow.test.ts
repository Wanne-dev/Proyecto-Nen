// Pruebas e2e del flujo de trading (capa de rutas, sin base de datos).
// El flujo completo (crear orden de mercado con fondos) requiere PostgreSQL y
// se ejecuta en el entorno Docker; ver docs/referencia-tecnica/env-setup.md.
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("E2E trading — guardas de autenticación", () => {
  it("rechaza crear una orden sin token (401)", async () => {
    const res = await request(app)
      .post("/api/v1/orders")
      .send({ symbol: "BTC", side: "buy", type: "market", quantity: 0.001 });
    expect(res.status).toBe(401);
  });

  it("rechaza listar órdenes sin token (401)", async () => {
    const res = await request(app).get("/api/v1/orders");
    expect(res.status).toBe(401);
  });

  it("rechaza cancelar una orden sin token (401)", async () => {
    const res = await request(app).delete("/api/v1/orders/abc");
    expect(res.status).toBe(401);
  });
});
