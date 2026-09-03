import { describe, it, expect } from "vitest";
import {
  formatMoney,
  formatUsd,
  formatCompact,
  formatPercent,
  formatTimeAgo,
  maskAccount,
  currencyName,
  isSupportedCurrency,
} from "./formatters";

describe("formatters", () => {
  it("formatMoney incluye el código de moneda y nunca devuelve NaN", () => {
    const out = formatMoney(1234.5, "USD");
    expect(out).toContain("USD");
    expect(out).not.toContain("NaN");
  });

  it("formatUsd usa símbolo $", () => {
    expect(formatUsd(10)).toContain("$");
  });

  it("formatCompact abrevia magnitudes", () => {
    expect(formatCompact(1_500_000)).toContain("M");
    expect(formatCompact(2_000_000_000)).toContain("B");
    expect(formatCompact(1500)).toContain("K");
  });

  it("formatPercent firma valores positivos", () => {
    expect(formatPercent(3.14159, 2)).toBe("+3.14%");
    expect(formatPercent(-1.5, 1)).toBe("-1.5%");
  });

  it("formatTimeAgo devuelve texto relativo", () => {
    const haceUnMinuto = new Date(Date.now() - 30_000).toISOString();
    expect(formatTimeAgo(haceUnMinuto)).toContain("hace");
  });

  it("maskAccount oculta todo salvo los últimos 4 dígitos", () => {
    expect(maskAccount("1234567890")).toBe("**** 7890");
  });

  it("currencyName resuelve códigos conocidos", () => {
    expect(currencyName("BTC")).toBe("Bitcoin");
    expect(currencyName("XXX")).toBe("XXX");
  });

  it("isSupportedCurrency valida las monedas soportadas", () => {
    expect(isSupportedCurrency("USD")).toBe(true);
    expect(isSupportedCurrency("BTC")).toBe(true);
    expect(isSupportedCurrency("YYY")).toBe(false);
  });
});
