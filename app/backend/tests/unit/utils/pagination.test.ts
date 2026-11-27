// Pruebas de las utilidades de paginación.
import { describe, it, expect } from "vitest";
import { parsePagination, paginate } from "../../../src/utils/pagination";

describe("parsePagination", () => {
  it("usa valores por defecto", () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 20, offset: 0 });
  });

  it("parsea page y limit correctamente", () => {
    expect(parsePagination({ page: "3", limit: "10" })).toEqual({ page: 3, limit: 10, offset: 20 });
  });

  it("no permite valores inválidos o fuera de rango", () => {
    expect(parsePagination({ page: "-5" }).page).toBe(1);
    expect(parsePagination({ page: "-5", limit: "0" })).toEqual({ page: 1, limit: 20, offset: 0 });
    expect(parsePagination({ limit: "9999" }).limit).toBe(100); // maxLimit
  });
});

describe("paginate", () => {
  it("calcula totalPages, hasNext y hasPrev", () => {
    const r = paginate([1, 2], 25, 1, 10);
    expect(r.total).toBe(25);
    expect(r.totalPages).toBe(3);
    expect(r.hasNext).toBe(true);
    expect(r.hasPrev).toBe(false);
  });

  it("en la última página no hay hasNext", () => {
    const r = paginate([1], 25, 3, 10);
    expect(r.hasNext).toBe(false);
    expect(r.hasPrev).toBe(true);
  });
});
