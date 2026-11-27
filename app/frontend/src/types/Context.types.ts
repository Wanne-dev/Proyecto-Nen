/* Tipos de Contexto — BANCA NEN */
import type { User } from "./User.types";
import type { WalletData, Transaction } from "./Wallet.types";
import type { Order, OrderType, OrderSide } from "./Order.types";
import type { Asset } from "./Asset.types";

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export interface ThemeContextValue {
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export interface WalletContextValue {
  wallet: WalletData | null;
  transactions: Transaction[];
  loading: boolean;
  refresh: () => Promise<void>;
  deposit: (currency: string, amount: number, description?: string) => Promise<void>;
  withdraw: (currency: string, amount: number, description?: string) => Promise<void>;
}

export interface TradingContextValue {
  assets: Asset[];
  orders: Order[];
  placeOrder: (params: {
    type: OrderType;
    side: OrderSide;
    assetId: string;
    quantity: number;
    price?: number;
    stopPrice?: number;
  }) => Promise<Order>;
  cancelOrder: (id: string) => Promise<void>;
}

export interface NotificationItem {
  id: string;
  type: "transaction" | "security" | "market" | "system" | "promo";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  severity?: "info" | "success" | "warning" | "danger";
}
