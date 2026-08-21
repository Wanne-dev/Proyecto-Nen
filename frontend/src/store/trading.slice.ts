/* ============================================================
   STORE DE TRADING — BANCA NEN (API real)
   ============================================================ */
import { create } from "zustand";
import { orderService, type Order, type CreateOrderParams } from "../services/orders";

interface TradingState {
  orders: Order[];
  loading: boolean;
  lastOrder: Order | null;
  refreshOrders: () => Promise<void>;
  placeOrder: (params: CreateOrderParams) => Promise<Order>;
  cancelOrder: (id: string) => Promise<void>;
  reset: () => void;
}

export const useTradingStore = create<TradingState>()((set, get) => ({
  orders: [],
  loading: false,
  lastOrder: null,

  refreshOrders: async () => {
    set({ loading: true });
    try {
      const orders = await orderService.getMyOrders(1, 60);
      set({ orders, loading: false });
    } catch (e: any) {
      console.error("Orders error:", e?.message);
      set({ loading: false });
    }
  },

  placeOrder: async (params: CreateOrderParams) => {
    const order = await orderService.createOrder(params);
    set({ lastOrder: order, orders: [order, ...get().orders] });
    return order;
  },

  cancelOrder: async (id: string) => {
    await orderService.cancelOrder(id);
    set({ orders: get().orders.map((o) => (o.id === id ? { ...o, status: "cancelled" } : o)) });
  },

  reset: () => set({ orders: [], lastOrder: null }),
}));
