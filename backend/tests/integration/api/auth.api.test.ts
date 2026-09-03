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
});
