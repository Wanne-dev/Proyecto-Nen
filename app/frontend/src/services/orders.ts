/* ============================================================
   SERVICIO DE ÓRDENES — BANCA NEN (API real)
   ============================================================ */
import api, { unwrap } from "../api/client";

export interface Order {
  id: string;
  reference: string;
  type: string;
  side: string;
  asset: string;       // símbolo (BTC)
  assetName?: string;
  quantity: number;
  price: number;
  total: number;       // valor ejecutado
  fee: number;
  status: string;
  createdAt: string;
  filledAt?: string;
  stopPrice?: number;
  score: number;
  quoteSource?: "kraken" | "coingecko" | "simulado";
}

export interface CreateOrderParams {
  type: "market";
  side: "buy" | "sell";
  symbol: string;
  quantity: number;
}

export interface OrderPage {
  items: Order[];
  total: number;
  page: number;
  limit: number;
}

function toNum(v: any): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function normalize(raw: any): Order {
  const price = toNum(raw.avgFillPrice) || toNum(raw.price);
  const qty = toNum(raw.quantity);
  return {
    id: raw.id,
    reference: "ORD-" + String(raw.id).slice(0, 6).toUpperCase(),
    type: raw.type,
    side: raw.side,
    asset: String(raw.symbol || "").toUpperCase(),
    quantity: qty,
    price,
    total: raw.executedTotalUsd == null ? qty * price : toNum(raw.executedTotalUsd),
    fee: toNum(raw.commission),
    status: raw.status,
    createdAt: raw.createdAt,
    filledAt: raw.updatedAt,
    stopPrice: raw.stopPrice ? toNum(raw.stopPrice) : undefined,
    score: toNum(raw.iaScore),
    quoteSource: ["kraken", "coingecko", "simulado"].includes(raw.quoteSource) ? raw.quoteSource : undefined,
  };
}

export const orderService = {
  async createOrder(params: CreateOrderParams): Promise<Order> {
    const res = await api.post("/orders", {
      symbol: params.symbol,
      type: params.type,
      side: params.side,
      quantity: params.quantity,
    });
    return normalize(unwrap<any>(res.data));
  },

  async getMyOrders(page = 1, limit = 20): Promise<Order[]> {
    const res = await api.get("/orders", { params: { page, limit } });
    const data = unwrap<OrderPage>(res.data);
    return (data?.items || []).map(normalize);
  },

  async cancelOrder(id: string): Promise<any> {
    const res = await api.delete(`/orders/${id}`);
    return unwrap<any>(res.data);
  },
};
