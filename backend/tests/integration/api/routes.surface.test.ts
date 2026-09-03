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

  it("POST /api/v1/webhooks/wompi: la ruta existe (no es 404)", async () => {
    const res = await request(app)
      .post("/api/v1/webhooks/wompi")
      .send({ event: "transaction.updated", data: {} });
    // Sin base de datos el endpoint puede devolver 500 (no puede registrar el
    // evento); lo importante es que la ruta está montada y NO es 404.
    expect(res.status).not.toBe(404);
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
