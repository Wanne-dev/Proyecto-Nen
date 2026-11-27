import Decimal from "decimal.js";
import { Currency } from "../models/WalletBalance";
import { AppError } from "../middleware/errorHandler.middleware";

// Los campos NUMERIC de pg llegan como strings. Mantener decimales hasta que
// la operación quede persistida; no usar floats para sumar saldos o comisiones.
export const currencyDecimals: Record<Currency, number> = {
  USD: 2, COP: 2, EUR: 2, BTC: 8, ETH: 8, USDC: 6,
};

// Dos NUMERIC(18,8) pueden producir hasta 36 dígitos antes de redondear.
export const Money = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export const VIRTUAL_FEE_RATE = new Money("0.001");

export function roundAmount(value: Decimal.Value, digits: number): Decimal {
  return new Money(value).toDecimalPlaces(digits, Decimal.ROUND_HALF_UP);
}

export function assertVirtualAmount(value: number, currency: Currency): Decimal {
  const amount = new Money(value);
  const digits = currencyDecimals[currency];
  if (digits === undefined || !amount.isFinite() || amount.lte(0) || amount.gt(100_000_000) ||
      amount.decimalPlaces() > digits) {
    throw new AppError(`Monto inválido para ${currency}: debe ser positivo, hasta 100 millones y con máximo ${digits ?? 0} decimales`, 400);
  }
  return amount;
}

export function balanceAfterDebit(total: Decimal.Value, locked: Decimal.Value, debit: Decimal): Decimal {
  const balance = new Money(total);
  if (balance.minus(locked).lt(debit)) throw new AppError("Saldo disponible insuficiente", 400);
  return balance.minus(debit);
}
