// Pruebas de integración del API de autenticación (sin base de datos):
// verifican el montaje de rutas y la validación de entrada.
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../src/app";

describe("API /api/v1/auth", () => {
  it("rechaza el registro sin datos (400 de validación)", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({});
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("fail");
  });

  it("rechaza el registro con email inválido", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "no-email", password: "x" });
    expect(res.status).toBe(400);
  });

  it("rechaza el login sin datos (400 de validación)", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({});
    expect(res.status).toBe(400);
  });

  it("rechaza forgot-password sin email", async () => {
    const res = await request(app).post("/api/v1/auth/forgot-password").send({});
    expect(res.status).toBe(400);
  });
  it("rechaza mutaciones de navegador de otro origen", async () => {
    await request(app).post("/api/v1/auth/logout").set("Origin", "https://otro.example").set("Sec-Fetch-Site", "cross-site").expect(403);
    await request(app).post("/api/v1/auth/refresh").set("Origin", "https://otro.example").expect(403);
  });
  it("exige sesión para verificar y no usa un header Bearer como sesión", async () => {
    await request(app).post("/api/v1/auth/verify-email").send({ code: "123456" }).expect(401);
    await request(app).get("/api/v1/auth/profile").set("Authorization", "Bearer legado").expect(401);
  });
  it("refresh sin cookie responde 401 y el cierre sin sesión limpia cookies", async () => {
    await request(app).post("/api/v1/auth/refresh").expect(401);
    const result = await request(app).post("/api/v1/auth/logout").expect(204);
    expect(result.headers["set-cookie"]).toEqual(expect.arrayContaining([expect.stringMatching(/^nen_access=;/), expect.stringMatching(/^nen_refresh=;/)]));
  });
});
