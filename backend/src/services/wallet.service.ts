import { AppDataSource } from "../config/database";
import { Wallet, WalletType } from "../models/Wallet";
import { WalletBalance, Currency } from "../models/WalletBalance";
import { Transaction } from "../models/Transaction";
import { User } from "../models/User";
import { Between, FindOptionsWhere } from "typeorm";
import { getPrice } from "./market-client";
import { createNotification } from "./admin.service";

const walletRepo = () => AppDataSource.getRepository(Wallet);
const balanceRepo = () => AppDataSource.getRepository(WalletBalance);
const txRepo = () => AppDataSource.getRepository(Transaction);
const userRepo = () => AppDataSource.getRepository(User);

/* Tasa USD en vivo (best-effort, cacheada 60s) */
async function resolveUsdRate(currency: string): Promise<number> {
  if (currency === Currency.USD) return 1;
  const price = await getPrice(currency as string);
  if (price && price > 0) return price;
  /* Fallback: tasas de referencia (USD por 1 unidad de la moneda) */
  const fallback: Record<string, number> = { COP: 1 / 3950, EUR: 0.92, BTC: 67000, ETH: 3500, USDC: 1 };
  return fallback[currency] || 0;
}

/* Obtener o crear wallet del usuario */
export async function getOrCreateWallet(userId: string) {
  let wallet = await walletRepo().findOne({ where: { userId } as any });
  if (!wallet) {
    wallet = walletRepo().create({ userId, type: WalletType.MAIN, totalBalanceUsd: 0, isActive: true, dailyWithdrawalLimit: 5000, dailyWithdrawn: 0 });
    wallet = await walletRepo().save(wallet);
    const defaultCurrencies = [Currency.USD, Currency.BTC, Currency.ETH, Currency.USDC];
    for (const currency of defaultCurrencies) {
      const bal = balanceRepo().create({ walletId: wallet.id, currency, balance: 0, lockedAmount: 0, usdRate: currency === Currency.USD ? 1 : 0 });
      await balanceRepo().save(bal);
    }
  }
  const balances = await balanceRepo().find({ where: { walletId: wallet.id } as any });
  return { ...wallet, balances };
}

/* Obtener balances */
export async function getBalances(userId: string) {
  const wallet = await walletRepo().findOne({ where: { userId } as any });
  if (!wallet) return null;
  return balanceRepo().find({ where: { walletId: wallet.id } as any });
}

/* Depositar */
export async function deposit(userId: string, currency: string, amount: number, description?: string) {
  const walletData = await getOrCreateWallet(userId);
  const walletId = walletData.id;
  const curr = currency.toUpperCase() as any;
  let balance = await balanceRepo().findOne({ where: { walletId, currency: curr } as any });
  const usdRate = await resolveUsdRate(curr);
  if (!balance) {
    balance = balanceRepo().create({ walletId, currency: curr, balance: 0, lockedAmount: 0, usdRate });
    balance = await balanceRepo().save(balance);
  } else {
    balance.usdRate = usdRate;
    await balanceRepo().save(balance);
  }
  balance.balance = Number(balance.balance) + amount;
  await balanceRepo().save(balance);
  const refId = "DEP-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const tx = txRepo().create({
    walletId, userId, type: "deposit" as any, status: "completed" as any,
    amount, currency: curr, amountUsd: Math.round(amount * usdRate * 100) / 100,
    fee: 0, feeCurrency: "USD", description: description || "Deposito",
    referenceId: refId,
  });
  await txRepo().save(tx);
  await updateTotalBalance(walletId);
  createNotification(userId, "transaction", "Depósito confirmado", `Se acreditaron ${amount} ${curr} a tu billetera.`).catch(() => {});
  return { balance: Number(balance.balance), transaction: tx };
}

/* Retirar */
export async function withdraw(userId: string, currency: string, amount: number, description?: string) {
  const walletData = await getOrCreateWallet(userId);
  const walletId = walletData.id;
  const curr = currency.toUpperCase() as any;
  const balance = await balanceRepo().findOne({ where: { walletId, currency: curr } as any });
  if (!balance || Number(balance.balance) < amount) throw new Error("Saldo insuficiente");
  balance.balance = Number(balance.balance) - amount;
  await balanceRepo().save(balance);
  const refId = "WTH-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
  const tx = txRepo().create({
    walletId, userId, type: "withdrawal" as any, status: "completed" as any,
    amount, currency: curr, amountUsd: curr === Currency.USD ? amount : 0,
    fee: amount * 0.001, feeCurrency: "USD", description: description || "Retiro",
    referenceId: refId,
  });
  await txRepo().save(tx);
  await updateTotalBalance(walletId);
  createNotification(userId, "transaction", "Retiro procesado", `Se enviaron ${amount} ${curr} a tu cuenta bancaria.`).catch(() => {});
  return { balance: Number(balance.balance), transaction: tx };
}

/* Historial de transacciones */
export async function getTransactions(userId: string, page = 1, limit = 20) {
  const wallet = await walletRepo().findOne({ where: { userId } as any });
  if (!wallet) return [];
  return txRepo().find({
    where: { walletId: wallet.id } as any,
    order: { createdAt: "DESC" },
    skip: (page - 1) * limit,
    take: limit,
  });
}

/* Actualizar total balance USD */
async function updateTotalBalance(walletId: string) {
  const balances = await balanceRepo().find({ where: { walletId } as any });
  let total = 0;
  for (const b of balances) {
    total += Number(b.balance) * Number(b.usdRate);
  }
  await walletRepo().update(walletId, { totalBalanceUsd: total } as any);
}