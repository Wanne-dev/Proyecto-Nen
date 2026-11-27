import { randomUUID } from "node:crypto";
import { AppDataSource } from "../config/database";
import { Order, OrderType, OrderSide, OrderStatus } from "../models/Order";
import { Currency } from "../models/WalletBalance";
import { Transaction, TransactionType, TransactionStatus } from "../models/Transaction";
import { AppError } from "../middleware/errorHandler.middleware";
import { verifiedIdentity, type SessionIdentity, type ClientContext } from "./session.service";
import { UUID } from "../utils/jwt";
import { logAudit } from "./audit.service";
import { AuditAction } from "../models/AuditLog";
import { getVirtualTradeQuote, isVirtualTradeAsset } from "./virtual-quotes";
import { assertVirtualAmount, balanceAfterDebit, currencyDecimals, VIRTUAL_FEE_RATE, Money, roundAmount } from "./virtual-money";
import { resolveBalance, updateBalanceQuote, updateWalletTotal, withWallet } from "./wallet.service";
import { notifyOrderByEmail } from "./activity-email.service";

/* Puntaje ilustrativo según símbolo y lado; no usa datos de mercado. */
export function computeVirtualOrderScore(symbol: string, side: OrderSide): { score: number; riskLevel: string; explanation: object } {
  const seed = symbol.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
  const noise = (Math.sin(seed * 12.9898) * 43758.5453) % 1;
  const base = 45 + Math.abs(noise) * 40;
  const score = Math.round(base + (side === OrderSide.BUY ? 3 : -3));
  const riskLevel = score >= 65 ? "low" : score >= 45 ? "medium" : "high";
  return {
    score, riskLevel,
    explanation: { method: "simulated", inputs: { symbol, side } },
  };
}

/** Market simulado: el servidor es el único origen de la cotización. */
export async function createOrder(identity: SessionIdentity, body: {
  symbol: string; type: string; side: string; quantity: number;
}, context: ClientContext = {}) {
  const userId = identity.id;
  const symbol = body.symbol.toUpperCase();
  const side = body.side as OrderSide;
  if (!isVirtualTradeAsset(symbol)) throw new AppError("Activo no admitido: usa BTC, ETH o USDC", 400);
  if (body.type !== OrderType.MARKET) throw new AppError("Solo se admiten órdenes simuladas de mercado", 400);
  if (side !== OrderSide.BUY && side !== OrderSide.SELL) throw new AppError("Lado de orden inválido", 400);

  const quantity = assertVirtualAmount(body.quantity, symbol);
  const quote = await getVirtualTradeQuote(symbol);
  const total = roundAmount(quantity.times(quote.usd), 2);
  if (total.lte(0)) throw new AppError("La operación debe valer al menos 0,01 USD al redondear", 400);
  // La precisión 18,8 de Transaction admite diez dígitos enteros.
  if (total.gte(10_000_000_000)) throw new AppError("La orden supera el monto máximo permitido", 400);
  const fee = roundAmount(total.times(VIRTUAL_FEE_RATE), 2);
  const { score, riskLevel, explanation } = computeVirtualOrderScore(symbol, side);
  const order = await withWallet(identity, async (manager, wallet) => {
    const usd = await resolveBalance(manager, wallet.id, Currency.USD);
    const asset = await resolveBalance(manager, wallet.id, symbol);
    if (side === OrderSide.BUY) {
      usd.balance = balanceAfterDebit(usd.balance, usd.lockedAmount, total.plus(fee)).toFixed(2);
      asset.balance = new Money(asset.balance).plus(quantity).toFixed(currencyDecimals[symbol]);
    } else {
      asset.balance = balanceAfterDebit(asset.balance, asset.lockedAmount, quantity).toFixed(currencyDecimals[symbol]);
      usd.balance = new Money(usd.balance).plus(total.minus(fee)).toFixed(2);
    }
    updateBalanceQuote(asset, quote);
    await manager.save([usd, asset]);

    const orders = manager.getRepository(Order);
    const savedOrder = await orders.save(orders.create({
      userId, symbol, side, type: OrderType.MARKET, status: OrderStatus.FILLED,
      price: quote.usd, avgFillPrice: quote.usd,
      quantity: quantity.toFixed(currencyDecimals[symbol]), filledQuantity: quantity.toFixed(currencyDecimals[symbol]),
      commission: fee.toFixed(2), executedTotalUsd: total.toFixed(2), quoteSource: quote.source, iaScore: score, iaRiskLevel: riskLevel, iaExplanation: explanation,
      ipAddress: context.ipAddress || null,
    }));
    const transactions = manager.getRepository(Transaction);
    await transactions.save(transactions.create({
      walletId: wallet.id, userId, type: side === OrderSide.BUY ? TransactionType.TRADE_BUY : TransactionType.TRADE_SELL,
      status: TransactionStatus.COMPLETED, amount: total.toFixed(2), currency: Currency.USD,
      amountUsd: total.toFixed(2), fee: fee.toFixed(2), feeCurrency: Currency.USD,
      description: `${side === OrderSide.BUY ? "Compra" : "Venta"} simulada: ${quantity} ${symbol}`,
      referenceId: `ORD-${randomUUID()}`,
      metadata: { simulated: true, orderId: savedOrder.id, quoteSource: quote.source, executionPrice: quote.usd, quoteAsOf: quote.asOf.toISOString() },
    }));
    await updateWalletTotal(manager, wallet.id);
    await logAudit({ userId, action: AuditAction.ORDER_FILLED, entityType: "order", entityId: savedOrder.id,
      details: `Orden ${side} ${symbol} simulada`, ...context,
      newValues: { symbol, side, quantity: savedOrder.quantity, price: savedOrder.avgFillPrice, status: savedOrder.status },
    }, manager);
    return savedOrder;
  });
  void notifyOrderByEmail(userId, {
    side: side === OrderSide.BUY ? "compra" : "venta",
    symbol: order.symbol,
    quantity: String(order.quantity),
    priceUsd: String(order.avgFillPrice),
    totalUsd: String(order.executedTotalUsd),
    feeUsd: String(order.commission),
    at: new Date(order.createdAt).toISOString(),
  }).catch(() => {});
  return order;
}

export async function listOrders(userId: string, page = 1, limit = 20) {
  const [items, total] = await AppDataSource.getRepository(Order).findAndCount({
    where: { userId }, order: { createdAt: "DESC" }, skip: (page - 1) * limit, take: limit,
  });
  return { items, total, page, limit };
}

/** Compatibilidad: las órdenes abiertas históricas se pueden cancelar. */
export async function cancelOrder(identity: SessionIdentity, orderId: string, context: ClientContext = {}) {
  if (!UUID.test(orderId)) throw new AppError("Identificador de orden inválido", 400);
  return AppDataSource.transaction(async (manager) => {
    const { id: userId } = await verifiedIdentity(manager, identity);
    const orders = manager.getRepository(Order);
    const current = await orders.findOne({ where: { id: orderId, userId }, lock: { mode: "pessimistic_write" } });
    if (!current) throw new AppError("Orden no encontrada", 404);
    if (![OrderStatus.OPEN, OrderStatus.PENDING].includes(current.status)) {
      throw new AppError("Solo se pueden cancelar órdenes abiertas", 400);
    }
    const oldStatus = current.status;
    current.status = OrderStatus.CANCELLED;
    const order = await orders.save(current);
    await logAudit({ userId, action: AuditAction.ORDER_CANCELLED, entityType: "order", entityId: order.id,
      details: `Cancelación de orden ${order.symbol}`, oldValues: { status: oldStatus }, newValues: { status: order.status }, ...context,
    }, manager);
    return order;
  });
}
