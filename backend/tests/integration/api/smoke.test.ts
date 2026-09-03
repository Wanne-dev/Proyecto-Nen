// Smoke test de integración: la app Express se monta y responde sin BD.
// (No requiere PostgreSQL; el health check reporta "degradado" sin BD.)
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../../src/app";

describe("API — smoke test (sin base de datos)", () => {
  it("responde en la raíz con el mensaje de bienvenida", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Bienvenido a BANCA NEN API");
    expect(res.body.health).toBe("/api/v1/health");
  });

  it("expone el health check en /api/v1/health", async () => {
    const res = await request(app).get("/api/v1/health");
    expect([200, 503]).toContain(res.status);
    expect(res.body.service).toBe("BANCA NEN API");
    expect(res.body).toHaveProperty("database");
    expect(res.body).toHaveProperty("uptime");
  });

  it("devuelve 404 en rutas desconocidas", async () => {
    const res = await request(app).get("/api/v1/ruta-inexistente");
    expect(res.status).toBe(404);
  });

  it("rechaza rutas protegidas sin token (401/404 según montaje)", async () => {
    const res = await request(app).get("/api/v1/admin/users");
    // Sin token debe rechazar la petición (401) o no existir (404).
    expect([401, 404, 403]).toContain(res.status);
  });
});
