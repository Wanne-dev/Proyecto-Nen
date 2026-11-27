/* Tipos de Órdenes de Trading — BANCA NEN */
export type OrderType = "market" | "limit" | "stop_loss" | "take_profit" | "stop_limit" | "trailing_stop" | "oco";

export type OrderSide = "buy" | "sell";

export type OrderStatus = "pending" | "open" | "partial" | "filled" | "cancelled" | "rejected" | "expired";

export interface Order {
  id: string;
  reference: string;
  type: OrderType;
  side: OrderSide;
  asset: string;       // símbolo, ej: BTC
  quantity: number;
  price: number;
  total: number;
  fee: number;
  status: OrderStatus;
  createdAt: string;
  filledAt?: string;
  stopPrice?: number;
  takeProfit?: number;
  score: number;       // score IA 0-100
  triggerPrice?: number;
}

export interface CreateOrderParams {
  type: OrderType;
  side: OrderSide;
  assetId: string;
  quantity: number;
  price?: number;
  stopPrice?: number;
  takeProfit?: number;
  currency: string;
}

export interface Position {
  asset: string;
  symbol: string;
  quantity: number;
  avgEntry: number;
  currentPrice: number;
  pnlUsd: number;
  pnlPct: number;
}
