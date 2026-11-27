// Pruebas de la verificación de firma de webhooks (Wompi).
import { describe, it, expect } from "vitest";
import {
  computeWompiChecksum,
  verifyWompiChecksum,
} from "../../../src/services/webhook.service";

describe("webhook.service — firma Wompi", () => {
  const secret = "events-secret";

  it("genera un checksum SHA-256 en hex de 64 caracteres", () => {
    const h = computeWompiChecksum("tx-1", "APPROVED", 100000, secret);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifica una firma válida", () => {
    const h = computeWompiChecksum("tx-1", "APPROVED", 100000, secret);
    expect(verifyWompiChecksum("tx-1", "APPROVED", 100000, h, secret)).toBe(true);
  });

  it("rechaza una firma manipulada", () => {
    expect(verifyWompiChecksum("tx-1", "APPROVED", 100000, "0".repeat(64), secret)).toBe(false);
  });

  it("rechaza firma calculada con distinto monto", () => {
    const h = computeWompiChecksum("tx-1", "APPROVED", 100000, secret);
    expect(verifyWompiChecksum("tx-1", "APPROVED", 999999, h, secret)).toBe(false);
  });

  it("es determinista", () => {
    expect(computeWompiChecksum("tx-1", "APPROVED", 100000, secret)).toBe(
      computeWompiChecksum("tx-1", "APPROVED", 100000, secret)
    );
  });
});
