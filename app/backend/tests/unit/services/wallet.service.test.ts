// Pruebas de la API pública del servicio de billetera.
// (El flujo completo contra BD se cubre en tests/integration con Docker.)
import { describe, it, expect } from "vitest";
import * as walletService from "../../../src/services/wallet.service";

describe("wallet.service — API pública", () => {
  it("se importa sin efectos secundarios (sin conexión a BD)", () => {
    expect(walletService).toBeTruthy();
  });

  it("expone las operaciones de billetera", () => {
    expect(typeof walletService.getOrCreateWallet).toBe("function");
    expect(typeof walletService.getBalances).toBe("function");
    expect(typeof walletService.deposit).toBe("function");
    expect(typeof walletService.withdraw).toBe("function");
    expect(typeof walletService.getTransactions).toBe("function");
  });
});
