// Pruebas unitarias del score IA determinista de las órdenes.
import { describe, it, expect } from "vitest";
import { computeIAScore } from "../../../src/services/order.service";
import { OrderSide } from "../../../src/models/Order";

describe("computeIAScore (score IA de la orden)", () => {
  it("devuelve un score entero entre 0 y 100", () => {
    for (const symbol of ["BTC", "ETH", "AAPL", "COP"]) {
      for (const side of [OrderSide.BUY, OrderSide.SELL]) {
        const r = computeIAScore(symbol, side);
        expect(Number.isInteger(r.score)).toBe(true);
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("mapea el score a un riskLevel coherente", () => {
    const r = computeIAScore("BTC", OrderSide.BUY);
    expect(["low", "medium", "high"]).toContain(r.riskLevel);
    const esperado = r.score >= 65 ? "low" : r.score >= 45 ? "medium" : "high";
    expect(r.riskLevel).toBe(esperado);
  });

  it("es determinista: mismo símbolo y lado → mismo score", () => {
    const a = computeIAScore("ETH", OrderSide.BUY);
    const b = computeIAScore("ETH", OrderSide.BUY);
    expect(a.score).toBe(b.score);
    expect(a.riskLevel).toBe(b.riskLevel);
  });

  it("diferencia compra y venta (bonificación/penalización)", () => {
    const buy = computeIAScore("BTC", OrderSide.BUY);
    const sell = computeIAScore("BTC", OrderSide.SELL);
    expect(buy.score - sell.score).toBe(6);
  });

  it("incluye una explicación con las variables clave", () => {
    const r = computeIAScore("BTC", OrderSide.SELL);
    expect(r.explanation).toHaveProperty("rsi");
    expect(r.explanation).toHaveProperty("trend30d");
    expect(r.explanation).toHaveProperty("volumen");
    expect(r.explanation).toHaveProperty("soporte");
  });
});
