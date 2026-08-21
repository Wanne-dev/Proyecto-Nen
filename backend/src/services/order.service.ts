/* ============================================================
   BANCA NEN — Servicio de Órdenes de Trading
   ============================================================ */
import { AppDataSource } from "../config/database";
import { Order, OrderType, OrderSide, OrderStatus } from "../models/Order";
import { WalletBalance, Currency } from "../models/WalletBalance";
import { Transaction } from "../models/Transaction";
import { Wallet } from "../models/Wallet";
import { AppError } from "../middleware/errorHandler.middleware";
import { logAudit } from "./audit.service";
import { AuditAction } from "../models/AuditLog";
import { getPrice } from "./market-client";

const orderRepo = () => AppDataSource.getRepository(Order);
const balanceRepo = () => AppDataSource.getRepository(WalletBalance);
const txRepo = () => AppDataSource.getRepository(Transaction);
const walletRepo = () => AppDataSource.getRepository(Wallet);

const COMMISSION_RATE = 0.001;

function num(v: any): number { return Number(v) || 0; }

/* ---- Score IA determinista a partir del símbolo (0-100) ---- */
export function computeIAScore(symbol: string, side: OrderSide): { score: number; riskLevel: string; explanation: object } {
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const noise = (Math.sin(seed * 12.9898) * 43758.5453) % 1;
  const base = 45 + Math.abs(noise) * 40;
  const score = Math.round(base + (side === OrderSide.BUY ? 3 : -3));
  const riskLevel = score >= 65 ? "low" : score >= 45 ? "medium" : "high";
  const explanation = {
    rsi: Math.round(30 + Math.abs(noise) * 50),
    trend30d: score >= 50 ? "alcista" : "bajista",
    volumen: "normal",
    soporte: score >= 60 ? "cercano a soporte" : "alejado de soporte",
  };
  return { score, riskLevel, explanation };
}

/* ---- Crear orden ---- */
export async function createOrder(userId: string, body: {
  symbol: string; type: string; side: string; quantity: number;
  price?: number; stopPrice?: number; ip?: string;
}) {
  const symbol = (body.symbol || "").toUpperCase();
  const type = (body.type || "market").toLowerCase();
  const side = (body.side || "buy").toLowerCase();
  const quantity = Number(body.quantity);

  if (!symbol || !quantity || quantity <= 0) throw new AppError("Symbol y quantity requeridos", 400);
  if (!Object.values(OrderType).includes(type as OrderType)) throw new AppError("Tipo de orden invalido", 400);
  if (!Object.values(OrderSide).includes(side as OrderSide)) throw new AppError("Lado invalido", 400);

  const { score, riskLevel, explanation } = computeIAScore(symbol, side as OrderSide);
  const wallet = await walletRepo().findOne({ where: { userId } as any });
  if (!wallet) throw new AppError("No tienes billetera. Contacta soporte.", 400);

  let price = Number(body.price) || 0;
  let status = OrderStatus.OPEN;
  let filledQuantity = 0;
  let avgFillPrice = 0;
  let commission = 0;

  if (type === OrderType.MARKET) {
    /* Precio en vivo con fallback al precio enviado */
    const live = await getPrice(symbol);
    price = live || price;
    if (!price || price <= 0) throw new AppError("No fue posible obtener el precio de " + symbol, 400);

    const total = quantity * price;
    commission = Math.round(total * COMMISSION_RATE * 100) / 100;
    const currency = symbol as Currency;

    if (side === OrderSide.BUY) {
      const usd = await balanceRepo().findOne({ where: { walletId: wallet.id, currency: Currency.USD } as any });
      const usdAvail = num(usd?.balance);
      if (usdAvail < total + commission) throw new AppError("Saldo insuficiente en USD", 400);
      usd!.balance = num(usd!.balance) - total - commission;
      await balanceRepo().save(usd!);
      const asset = await balanceRepo().findOne({ where: { walletId: wallet.id, currency } as any });
      if (asset) {
        asset.balance = num(asset.balance) + quantity;
        await balanceRepo().save(asset);
      } else {
        await balanceRepo().save(balanceRepo().create({ walletId: wallet.id, currency, balance: quantity, lockedAmount: 0, usdRate: 0 }));
      }
    } else {
      const asset = await balanceRepo().findOne({ where: { walletId: wallet.id, currency } as any });
      const assetAvail = num(asset?.balance);
      if (assetAvail < quantity) throw new AppError("Saldo insuficiente en " + symbol, 400);
      asset!.balance = num(asset!.balance) - quantity;
      await balanceRepo().save(asset!);
      const usd = await balanceRepo().findOne({ where: { walletId: wallet.id, currency: Currency.USD } as any });
      usd!.balance = num(usd!.balance) + total - commission;
      await balanceRepo().save(usd!);
    }

    status = OrderStatus.FILLED;
    filledQuantity = quantity;
    avgFillPrice = price;

    await txRepo().save(txRepo().create({
      walletId: wallet.id, userId, type: side === OrderSide.BUY ? "trade_buy" : "trade_sell",
      status: "completed", amount: total, currency: "USD", amountUsd: total,
      fee: commission, feeCurrency: "USD",
      description: `${side === "buy" ? "Compra" : "Venta"} ${quantity} ${symbol} a ${price} USD`,
      referenceId: "ORD-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    }));
  }

  const order = orderRepo().create({
    userId, symbol, type: type as OrderType, side: side as OrderSide, status,
    price, stopPrice: body.stopPrice ? Number(body.stopPrice) : null,
    quantity, filledQuantity, avgFillPrice,
    iaScore: score, iaRiskLevel: riskLevel, iaExplanation: explanation,
    commission, ipAddress: body.ip || null,
  });
  const saved = await orderRepo().save(order);

  await logAudit({
    userId, action: status === OrderStatus.FILLED ? AuditAction.ORDER_FILLED : AuditAction.ORDER_CREATED,
    entityType: "order", entityId: saved.id, ipAddress: body.ip,
    details: `${side === "buy" ? "Compra" : "Venta"} ${quantity} ${symbol} (${type})`,
    newValues: { symbol, type, side, quantity, price, status },
  });

  await updateTotal(wallet.id);
  return saved;
}

/* ---- Listar órdenes del usuario ---- */
export async function listOrders(userId: string, page = 1, limit = 20) {
  const [items, total] = await orderRepo().findAndCount({
    where: { userId } as any,
    order: { createdAt: "DESC" },
    skip: (page - 1) * limit,
    take: limit,
  });
  return { items, total, page, limit };
}

/* ---- Cancelar orden ---- */
export async function cancelOrder(userId: string, orderId: string, ip?: string) {
  const order = await orderRepo().findOne({ where: { id: orderId, userId } as any });
  if (!order) throw new AppError("Orden no encontrada", 404);
  if (![OrderStatus.OPEN, OrderStatus.PENDING].includes(order.status)) {
    throw new AppError("Solo se pueden cancelar ordenes abiertas", 400);
  }
  order.status = OrderStatus.CANCELLED;
  await orderRepo().save(order);
  await logAudit({
    userId, action: AuditAction.ORDER_CANCELLED, entityType: "order", entityId: order.id,
    ipAddress: ip, details: `Cancelada orden ${order.symbol} (${order.side})`,
    newValues: { status: "cancelled" },
  });
  return order;
}

/* ---- Recalcular total USD de la billetera ---- */
export async function updateTotal(walletId: string) {
  const balances = await balanceRepo().find({ where: { walletId } as any });
  let total = 0;
  for (const b of balances) total += num(b.balance) * num(b.usdRate);
  await walletRepo().update(walletId, { totalBalanceUsd: Math.round(total * 100) / 100 } as any);
}
