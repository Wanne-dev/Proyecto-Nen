/* Hook: trading — BANCA NEN */
import { useEffect } from "react";
import { useTradingStore } from "../store/trading.slice";

export function useTrading() {
  const orders = useTradingStore((s) => s.orders);
  const loading = useTradingStore((s) => s.loading);
  const lastOrder = useTradingStore((s) => s.lastOrder);
  const refreshOrders = useTradingStore((s) => s.refreshOrders);
  const placeOrder = useTradingStore((s) => s.placeOrder);
  const cancelOrder = useTradingStore((s) => s.cancelOrder);

  useEffect(() => {
    refreshOrders();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { orders, loading, lastOrder, refreshOrders, placeOrder, cancelOrder };
}
