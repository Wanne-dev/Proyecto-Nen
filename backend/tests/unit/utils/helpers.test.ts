// Pruebas de utilidades varias.
import { describe, it, expect } from "vitest";
import { safeJsonParse, maskEmail, isNumeric, toNumber, randomString } from "../../../src/utils/helpers";

describe("utils/helpers", () => {
  it("safeJsonParse devuelve el objeto parseado o el fallback", () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
    expect(safeJsonParse("no-json", { a: 1 })).toEqual({ a: 1 });
    expect(safeJsonParse(null, "fallback")).toBe("fallback");
  });

  it("maskEmail oculta la parte central del usuario", () => {
    const masked = maskEmail("ana.perez@example.com");
    expect(masked).toContain("@example.com");
    expect(masked).not.toContain("ana.perez");
  });

  it("isNumeric detecta números", () => {
    expect(isNumeric(42)).toBe(true);
    expect(isNumeric("42.5")).toBe(true);
    expect(isNumeric("abc")).toBe(false);
  });

  it("toNumber convierte con fallback", () => {
    expect(toNumber("12")).toBe(12);
    expect(toNumber("no", 7)).toBe(7);
  });

  it("randomString respeta la longitud", () => {
    expect(randomString(12)).toHaveLength(12);
  });
});
