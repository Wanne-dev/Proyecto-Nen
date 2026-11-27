// Pruebas unitarias del puntaje simulado determinista de las órdenes.
import { describe, it, expect } from "vitest";
import { computeVirtualOrderScore } from "../../../src/services/order.service";
import { OrderSide } from "../../../src/models/Order";

describe("computeVirtualOrderScore (puntaje simulado de la orden)", () => {
  it("devuelve un score entero entre 0 y 100", () => {
    for (const symbol of ["BTC", "ETH", "AAPL", "COP"]) {
      for (const side of [OrderSide.BUY, OrderSide.SELL]) {
        const r = computeVirtualOrderScore(symbol, side);
        expect(Number.isInteger(r.score)).toBe(true);
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("mapea el score a un riskLevel coherente", () => {
    const r = computeVirtualOrderScore("BTC", OrderSide.BUY);
    expect(["low", "medium", "high"]).toContain(r.riskLevel);
    const esperado = r.score >= 65 ? "low" : r.score >= 45 ? "medium" : "high";
    expect(r.riskLevel).toBe(esperado);
  });

  it("es determinista: mismo símbolo y lado → mismo score", () => {
    const a = computeVirtualOrderScore("ETH", OrderSide.BUY);
    const b = computeVirtualOrderScore("ETH", OrderSide.BUY);
    expect(a.score).toBe(b.score);
    expect(a.riskLevel).toBe(b.riskLevel);
  });

  it("diferencia compra y venta (bonificación/penalización)", () => {
    const buy = computeVirtualOrderScore("BTC", OrderSide.BUY);
    const sell = computeVirtualOrderScore("BTC", OrderSide.SELL);
    expect(buy.score - sell.score).toBe(6);
  });

  it("identifica que el puntaje no viene del mercado", () => {
    const r = computeVirtualOrderScore("BTC", OrderSide.SELL);
    expect(r.explanation).toEqual({ method: "simulated", inputs: { symbol: "BTC", side: OrderSide.SELL } });
  });
});
