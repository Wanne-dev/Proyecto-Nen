import { randomUUID } from "node:crypto";
import { EntityManager } from "typeorm";
import { AppDataSource } from "../config/database";
import { AppError } from "../middleware/errorHandler.middleware";
import { Wallet, WalletType } from "../models/Wallet";
import { WalletBalance, Currency } from "../models/WalletBalance";
import { Transaction, TransactionType, TransactionStatus } from "../models/Transaction";
import { AuditAction } from "../models/AuditLog";
import { logAudit } from "./audit.service";
import { verifiedIdentity, type SessionIdentity, type ClientContext } from "./session.service";
import { getVirtualQuote, type VirtualQuote } from "./virtual-quotes";
import { assertVirtualAmount, balanceAfterDebit, currencyDecimals, VIRTUAL_FEE_RATE, Money, roundAmount } from "./virtual-money";
import { createNotification } from "./notification.service";
import { notifyMovementByEmail } from "./activity-email.service";

/**
 * Las mutaciones de una misma billetera se serializan, incluso en su primera
 * creación. No hacer llamadas de red dentro del bloqueo. Saldos, movimientos
 * y órdenes se guardan en una misma transacción o se revierten juntos.
 */
export async function withWallet<T>(identity: SessionIdentity, action: (manager: EntityManager, wallet: Wallet) => Promise<T>): Promise<T> {
  return AppDataSource.transaction(async (manager) => {
    const { id: userId } = await verifiedIdentity(manager, identity);
    const wallets = manager.getRepository(Wallet);
    let wallet = await wallets.findOneBy({ userId });
    if (!wallet) {
      wallet = await wallets.save(wallets.create({ userId, type: WalletType.MAIN }));
      const balances = manager.getRepository(WalletBalance);
      await balances.insert(Object.values(Currency).map((currency) => ({
        walletId: wallet!.id, currency, balance: "0", lockedAmount: "0", usdRate: currency === Currency.USD ? "1" : "0",
      })));
    }
    if (!wallet.isActive) throw new AppError("La billetera no está activa", 403);
    return action(manager, wallet);
  });
}

export async function getOrCreateWallet(identity: SessionIdentity) {
  return withWallet(identity, async (manager, wallet) => ({
    ...wallet,
    balances: await manager.getRepository(WalletBalance).findBy({ walletId: wallet.id }),
  }));
}

export async function getBalances(userId: string) {
  const wallet = await AppDataSource.getRepository(Wallet).findOneBy({ userId });
  return wallet ? AppDataSource.getRepository(WalletBalance).findBy({ walletId: wallet.id }) : null;
}

export async function resolveBalance(manager: EntityManager, walletId: string, currency: Currency) {
  const balances = manager.getRepository(WalletBalance);
  return (await balances.findOneBy({ walletId, currency })) || balances.create({
    walletId, currency, balance: "0", lockedAmount: "0", usdRate: currency === Currency.USD ? "1" : "0",
  });
}

export function updateBalanceQuote(balance: WalletBalance, quote: VirtualQuote) {
  balance.usdRate = quote.usd;
  balance.usdRateUpdatedAt = quote.asOf;
}

export async function updateWalletTotal(manager: EntityManager, walletId: string): Promise<string> {
  const balances = await manager.getRepository(WalletBalance).findBy({ walletId });
  const total = balances.reduce((sum, balance) => sum.plus(new Money(balance.balance).times(balance.usdRate)), new Money(0));
  const totalBalanceUsd = roundAmount(total, 2).toFixed(2);
  await manager.getRepository(Wallet).update(walletId, { totalBalanceUsd });
  return totalBalanceUsd;
}

export async function deposit(identity: SessionIdentity, currency: Currency, amount: number, description?: string, context: ClientContext = {}) {
  const userId = identity.id;
  const value = assertVirtualAmount(amount, currency);
  const quote = await getVirtualQuote(currency);
  const result = await withWallet(identity, async (manager, wallet) => {
    const balance = await resolveBalance(manager, wallet.id, currency);
    balance.balance = new Money(balance.balance).plus(value).toFixed(currencyDecimals[currency]);
    updateBalanceQuote(balance, quote);
    await manager.save(balance);
    const transactions = manager.getRepository(Transaction);
    const transaction = await transactions.save(transactions.create({
      walletId: wallet.id, userId, type: TransactionType.DEPOSIT, status: TransactionStatus.COMPLETED,
      amount: value.toFixed(currencyDecimals[currency]), currency,
      amountUsd: roundAmount(value.times(quote.usd), 2).toFixed(2), fee: "0", feeCurrency: currency,
      description: description || "Depósito", referenceId: `DEP-${randomUUID()}`,
      metadata: { virtual: true, quoteSource: quote.source, quoteAsOf: quote.asOf.toISOString() },
    }));
    const totalBalanceUsd = await updateWalletTotal(manager, wallet.id);
    await logAudit({ userId, action: AuditAction.DEPOSIT, entityType: "wallet", entityId: transaction.id,
      details: "Depósito en billetera", newValues: { amount: transaction.amount, currency }, ...context }, manager);
    return { balance: balance.balance, totalBalanceUsd, transaction };
  });
  void createNotification(userId, "transaction", "Depósito acreditado", `Se acreditaron ${value} ${currency} en tu billetera.`).catch(() => {});
  void notifyMovementByEmail(userId, {
    kind: "depósito",
    amount: String(result.transaction.amount),
    currency,
    totalUsd: String(result.transaction.amountUsd),
    at: new Date(result.transaction.createdAt).toISOString(),
  }).catch(() => {});
  return result;
}

export async function withdraw(identity: SessionIdentity, currency: Currency, amount: number, description?: string, context: ClientContext = {}) {
  const userId = identity.id;
  const value = assertVirtualAmount(amount, currency);
  const quote = await getVirtualQuote(currency);
  const digits = currencyDecimals[currency];
  const fee = roundAmount(value.times(VIRTUAL_FEE_RATE), digits);
  const debitUsd = roundAmount(value.plus(fee).times(quote.usd), 2);
  const result = await withWallet(identity, async (manager, wallet) => {
    const day = new Date().toISOString().slice(0, 10);
    const lastReset = wallet.dailyWithdrawnReset
      ? new Date(wallet.dailyWithdrawnReset).toISOString().slice(0, 10)
      : null;
    const usedToday = lastReset === day ? new Money(wallet.dailyWithdrawn ?? 0) : new Money(0);
    const dailyLimit = new Money(wallet.dailyWithdrawalLimit ?? 5000);
    if (usedToday.plus(debitUsd).gt(dailyLimit)) {
      throw new AppError("Límite diario de retiro excedido", 400);
    }
    const balance = await resolveBalance(manager, wallet.id, currency);
    balance.balance = balanceAfterDebit(balance.balance, balance.lockedAmount, value.plus(fee)).toFixed(digits);
    updateBalanceQuote(balance, quote);
    await manager.save(balance);
    wallet.dailyWithdrawn = Number(usedToday.plus(debitUsd).toFixed(2));
    wallet.dailyWithdrawnReset = new Date();
    await manager.save(wallet);
    const transactions = manager.getRepository(Transaction);
    const transaction = await transactions.save(transactions.create({
      walletId: wallet.id, userId, type: TransactionType.WITHDRAWAL, status: TransactionStatus.COMPLETED,
      amount: value.toFixed(digits), currency, amountUsd: roundAmount(value.times(quote.usd), 2).toFixed(2),
      fee: fee.toFixed(digits), feeCurrency: currency, description: description || "Retiro",
      referenceId: `WTH-${randomUUID()}`, metadata: { virtual: true, quoteSource: quote.source, quoteAsOf: quote.asOf.toISOString() },
    }));
    const totalBalanceUsd = await updateWalletTotal(manager, wallet.id);
    await logAudit({ userId, action: AuditAction.WITHDRAWAL, entityType: "wallet", entityId: transaction.id,
      details: "Retiro de billetera", newValues: { amount: transaction.amount, currency, fee: transaction.fee }, ...context }, manager);
    return { balance: balance.balance, totalBalanceUsd, transaction };
  });
  void createNotification(userId, "transaction", "Retiro procesado", `Se descontaron ${value} ${currency} de tu billetera.`).catch(() => {});
  void notifyMovementByEmail(userId, {
    kind: "retiro",
    amount: String(result.transaction.amount),
    currency,
    totalUsd: String(result.transaction.amountUsd),
    fee: String(result.transaction.fee),
    at: new Date(result.transaction.createdAt).toISOString(),
  }).catch(() => {});
  return result;
}

export async function getTransactions(userId: string, page = 1, limit = 20) {
  const wallet = await AppDataSource.getRepository(Wallet).findOneBy({ userId });
  if (!wallet) return [];
  return AppDataSource.getRepository(Transaction).find({
    where: { walletId: wallet.id }, order: { createdAt: "DESC" },
    skip: (page - 1) * limit, take: limit,
  });
}
