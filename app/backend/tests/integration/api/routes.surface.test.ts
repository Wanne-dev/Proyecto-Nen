// Verifica que las nuevas rutas están montadas y protegidas.
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../src/app";

describe("Superficie de API — rutas montadas", () => {
  it("GET /api/v1/user/me exige autenticación (401)", async () => {
    const res = await request(app).get("/api/v1/user/me");
    expect(res.status).toBe(401);
  });

  it("PATCH /api/v1/user/me valida el body y exige autenticación", async () => {
    const res = await request(app).patch("/api/v1/user/me").send({ firstName: "A" });
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/transactions exige autenticación (401)", async () => {
    const res = await request(app).get("/api/v1/transactions");
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/webhooks/wompi: pagos reales deshabilitados (503)", async () => {
    const res = await request(app)
      .post("/api/v1/webhooks/wompi")
      .send({ event: "transaction.updated", data: {} });
    expect(res.status).toBe(503);
  });

  it("GET /api/v1/news y /api/news exigen autenticación", async () => {
    expect((await request(app).get("/api/v1/news")).status).toBe(401);
    expect((await request(app).get("/api/news")).status).toBe(401);
  });

  it("POST /api/v1/news/analyze exige autenticación", async () => {
    const res = await request(app).post("/api/v1/news/analyze").send({ title: "Bitcoin sube" });
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/docs (Swagger UI) responde", async () => {
    const res = await request(app).get("/api/v1/docs/");
    expect([200, 301, 302]).toContain(res.status);
  });

  it("GET /api/v1/docs-json expone la especificación OpenAPI", async () => {
    const res = await request(app).get("/api/v1/docs-json");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("openapi");
    expect(res.body.info.title).toContain("BANCA NEN");
  });
});
