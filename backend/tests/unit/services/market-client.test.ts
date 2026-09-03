// Pruebas unitarias de la caché en memoria del cliente de mercado.
import { describe, it, expect } from "vitest";
import { getCache, setCache } from "../../../src/services/market-client";

describe("market-client — caché en memoria", () => {
  it("devuelve null cuando no hay dato cacheado", () => {
    const key = "inexistente-" + Date.now() + "-" + Math.random();
    expect(getCache(key)).toBeNull();
  });

  it("almacena y recupera un valor", () => {
    const key = "BTC-" + Date.now() + "-" + Math.random();
    const data = { precio: 67500, ts: Date.now() };
    setCache(key, data);
    expect(getCache(key)).toEqual(data);
  });

  it("sirve datos recién guardados (dentro del TTL)", () => {
    const key = "caduca-" + Date.now() + "-" + Math.random();
    setCache(key, "vivo");
    expect(getCache(key)).toBe("vivo");
  });

  it("permite sobrescribir una clave", () => {
    const key = "sobre-" + Date.now() + "-" + Math.random();
    setCache(key, 1);
    setCache(key, 2);
    expect(getCache(key)).toBe(2);
  });
});
