import { MoreThan } from "typeorm";
import { AppDataSource } from "../config/database";
import { Transaction, TransactionType } from "../models/Transaction";
import { User } from "../models/User";
import { Wallet } from "../models/Wallet";
import { WalletBalance } from "../models/WalletBalance";
import { Currency } from "../models/WalletBalance";
import { Money, roundAmount } from "./virtual-money";

const readable = (value: string | number | null | undefined, digits: number) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number.toFixed(digits) : "0";
};

/**
 * Resumen agregado y sin datos personales para el asistente. Nunca se envían
 * nombres, documentos, correos, descripciones de movimientos ni referencias.
 */
export async function getAssistantPortfolio(userId: string): Promise<string> {
  try {
    const wallet = await AppDataSource.getRepository(Wallet).findOneBy({ userId });
    if (!wallet || !wallet.isActive) return "El usuario no tiene una billetera activa.";
    const balances = await AppDataSource.getRepository(WalletBalance).findBy({ walletId: wallet.id });
    const lines = balances.map((balance) => {
      const digits = balance.currency === Currency.BTC || balance.currency === Currency.ETH ? 6 : 2;
      return `- ${balance.currency}: ${readable(balance.balance, digits)} (1 ${balance.currency} = ${readable(balance.usdRate, 6)} USD)`;
    });
    const recent = await AppDataSource.getRepository(Transaction).find({
      where: { walletId: wallet.id }, order: { createdAt: "DESC" }, take: 5,
    });
    const movements = recent.map((item) =>
      `- ${item.type} ${item.currency} ${readable(item.amount, 8)} (${new Date(item.createdAt).toISOString().slice(0, 10)})`);
    return [
      "Resumen de la billetera virtual del usuario (solo lectura):",
      ...(lines.length ? lines : ["- Sin saldos registrados."]),
      `Total aproximado en USD: ${readable(wallet.totalBalanceUsd, 2)}`,
      "Últimos movimientos (sin descripciones ni referencias):",
      ...(movements.length ? movements : ["- Sin movimientos registrados."]),
      "El saldo es virtual; no representa dinero real ni permite operar.",
    ].join("\n");
  } catch {
    return "No se pudo leer el resumen de la billetera del usuario.";
  }
}

/** Datos agregados para el perfil administrador, sin correos, documentos ni nombres. */
export async function getAdminOverview(): Promise<Record<string, unknown>> {
  try {
    const users = await AppDataSource.getRepository(User).find({
      select: { id: true, role: true, accountStatus: true },
    });
    const wallets = await AppDataSource.getRepository(Wallet).find({
      select: { id: true, isActive: true, totalBalanceUsd: true },
    });
    const since = new Date(Date.now() - 30 * 86_400_000);
    const transactions = await AppDataSource.getRepository(Transaction).find({
      select: { id: true, type: true, amountUsd: true, createdAt: true },
      where: { createdAt: MoreThan(since) },
    });
    const count = (rows: Array<{ role?: string; accountStatus?: string }>, field: "role" | "accountStatus") =>
      rows.reduce<Record<string, number>>((totals, row) => {
        const key = String(row[field] ?? "desconocido");
        totals[key] = (totals[key] ?? 0) + 1;
        return totals;
      }, {});
    const totalUsd = wallets.reduce((sum, wallet) => sum.plus(new Money(wallet.totalBalanceUsd ?? 0)), new Money(0));
    const income = transactions.filter((item) => item.type === TransactionType.DEPOSIT)
      .reduce((sum, item) => sum.plus(new Money(item.amountUsd ?? 0)), new Money(0));
    const expense = transactions.filter((item) => item.type === TransactionType.WITHDRAWAL)
      .reduce((sum, item) => sum.plus(new Money(item.amountUsd ?? 0)), new Money(0));
    return {
      at: new Date().toISOString(),
      users: { total: users.length, byRole: count(users, "role"), byStatus: count(users, "accountStatus") },
      wallets: { total: wallets.length, active: wallets.filter((wallet) => wallet.isActive).length,
        totalVirtualUsd: roundAmount(totalUsd, 2).toFixed(2) },
      movements30d: { count: transactions.length, deposits: transactions.filter((item) => item.type === TransactionType.DEPOSIT).length,
        withdrawals: transactions.filter((item) => item.type === TransactionType.WITHDRAWAL).length,
        incomeUsd: roundAmount(income, 2).toFixed(2), expenseUsd: roundAmount(expense, 2).toFixed(2) },
      note: "Solo agregados. No se envían correos, documentos, nombres ni identificadores al proveedor de IA.",
    };
  } catch {
    return { error: "No se pudo leer el resumen agregado de la plataforma." };
  }
}
