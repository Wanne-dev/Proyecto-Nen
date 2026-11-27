// Pruebas unitarias de la auditoría inmutable (hash encadenado SHA-256).
import { describe, it, expect } from "vitest";
import { hashEntry } from "../../../src/services/audit.service";

describe("hashEntry (cadena de auditoría)", () => {
  it("genera un hash hexadecimal SHA-256 de 64 caracteres", () => {
    const h = hashEntry(null, JSON.stringify({ action: "login" }));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("es determinista para la misma entrada", () => {
    const payload = JSON.stringify({ action: "register", userId: "u1" });
    expect(hashEntry(null, payload)).toBe(hashEntry(null, payload));
  });

  it("encadena el hash previo (integridad inmutable)", () => {
    const genesis = hashEntry(null, "registro-1");
    const segundo = hashEntry(genesis, "registro-2");
    expect(segundo).not.toBe(genesis);
    // Un mismo registro con distinto hash previo produce un hash distinto
    expect(segundo).not.toBe(hashEntry(null, "registro-2"));
  });

  it("usa GENESIS como semilla cuando no hay hash previo", () => {
    const a = hashEntry(null, "x");
    const b = hashEntry("", "x"); // prevHash vacío se trata como GENESIS
    expect(a).toBe(b);
  });
});

it("detecta modificaciones o saltos de posición en registros encadenados", async () => {
  const { auditPayload, checkAuditChain } = await import("../../../src/services/audit.service");
  const record = { id: "fixture", chainPosition: "1", prevHash: null, createdAt: new Date("2026-11-18T00:00:00Z"), action: "deposit", newValues: { amount: 50, currency: "USD" } } as import("../../../src/models/AuditLog").AuditLog;
  record.currHash = hashEntry(null, auditPayload(record));
  expect(checkAuditChain([record])).toEqual({ valid: true, firstInvalid: null, checked: 1 });
  expect(checkAuditChain([{ ...record, details: "alterado" }])).toMatchObject({ valid: false, firstInvalid: "1" });
  expect(checkAuditChain([{ ...record, chainPosition: "2" }])).toMatchObject({ valid: false, firstInvalid: "2" });
});
