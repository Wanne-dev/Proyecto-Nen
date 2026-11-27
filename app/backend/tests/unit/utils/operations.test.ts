import { describe, expect, it } from "vitest";
import { offlineMarketEnabled, virtualOperationsEnabled } from "../../../src/config/operations";

describe("configuración de operaciones", () => {
  it("permite saldo virtual solo en desarrollo y con el modo explícito", () => {
    expect(virtualOperationsEnabled({ NODE_ENV: "development", APP_MODE: "virtual" })).toBe(true);
    expect(virtualOperationsEnabled({ NODE_ENV: "development", APP_MODE: "other" })).toBe(false);
    expect(virtualOperationsEnabled({ NODE_ENV: "development", APP_MODE: "" })).toBe(false);
  });

  it("bloquea producción incluso si alguien configura el modo virtual", () => {
    expect(virtualOperationsEnabled({ NODE_ENV: "production", APP_MODE: "virtual" })).toBe(false);
    expect(virtualOperationsEnabled({ NODE_ENV: " Production ", APP_MODE: "virtual" })).toBe(false);
    expect(virtualOperationsEnabled({ NODE_ENV: "test", APP_MODE: "locked" })).toBe(false);
  });

  it("solo lee la variable vigente de mercado", () => {
    expect(offlineMarketEnabled({ MARKET_OFFLINE: "true" })).toBe(true);
    expect(offlineMarketEnabled({ MARKET_OFFLINE: "false" })).toBe(false);
    expect(offlineMarketEnabled({})).toBe(false);
  });
});
