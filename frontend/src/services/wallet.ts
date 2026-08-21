/* ============================================================
   SERVICIO DE BILLETERA — BANCA NEN (API real)
   ============================================================ */
import api, { unwrap } from "../api/client";

export interface WalletBalance {
  id: string;
  walletId: string;
  currency: string;
  balance: number;
  lockedAmount: number;
  usdRate: number;
  usdRateUpdatedAt?: string;
}

export interface WalletData {
  id: string;
  userId: string;
  type: string;
  totalBalanceUsd: number;
  isActive: boolean;
  dailyWithdrawalLimit: number;
  dailyWithdrawn: number;
  balances: WalletBalance[];
  createdAt?: string;
}

export interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  amountUsd: number;
  fee: number;
  feeCurrency: string;
  description: string;
  referenceId: string;
  createdAt: string;
}

function toNumber(v: any): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function normalizeWallet(raw: any): WalletData {
  return {
    id: raw.id,
    userId: raw.userId,
    type: raw.type,
    totalBalanceUsd: toNumber(raw.totalBalanceUsd),
    isActive: raw.isActive,
    dailyWithdrawalLimit: toNumber(raw.dailyWithdrawalLimit),
    dailyWithdrawn: toNumber(raw.dailyWithdrawn),
    createdAt: raw.createdAt,
    balances: (raw.balances || []).map((b: any) => ({
      id: b.id,
      walletId: b.walletId,
      currency: b.currency,
      balance: toNumber(b.balance),
      lockedAmount: toNumber(b.lockedAmount),
      usdRate: toNumber(b.usdRate),
      usdRateUpdatedAt: b.usdRateUpdatedAt,
    })),
  };
}

function normalizeTx(raw: any): Transaction {
  return {
    id: raw.id,
    type: raw.type,
    status: raw.status,
    amount: toNumber(raw.amount),
    currency: raw.currency,
    amountUsd: toNumber(raw.amountUsd),
    fee: toNumber(raw.fee),
    feeCurrency: raw.feeCurrency || "USD",
    description: raw.description || "",
    referenceId: raw.referenceId,
    createdAt: raw.createdAt,
  };
}

export const walletService = {
  async getWallet(): Promise<WalletData> {
    const res = await api.get("/wallet");
    return normalizeWallet(unwrap<any>(res.data));
  },

  async getBalances(): Promise<WalletBalance[]> {
    const res = await api.get("/wallet/balances");
    const raw = unwrap<any[]>(res.data) || [];
    return raw.map((b) => ({
      id: b.id, walletId: b.walletId, currency: b.currency,
      balance: toNumber(b.balance), lockedAmount: toNumber(b.lockedAmount), usdRate: toNumber(b.usdRate),
    }));
  },

  async deposit(currency: string, amount: number, description?: string) {
    const res = await api.post("/wallet/deposit", { currency, amount, description });
    return unwrap<any>(res.data);
  },

  async withdraw(currency: string, amount: number, description?: string) {
    const res = await api.post("/wallet/withdraw", { currency, amount, description });
    return unwrap<any>(res.data);
  },

  async getTransactions(page = 1, limit = 20): Promise<Transaction[]> {
    const res = await api.get("/wallet/transactions", { params: { page, limit } });
    const raw = unwrap<any[]>(res.data) || [];
    return raw.map(normalizeTx);
  },
};

/* ---- Compatibilidad con páginas existentes (token se lee del store) ---- */
export async function getWallet(_token?: string): Promise<WalletData> {
  return walletService.getWallet();
}
export async function getTransactions(_token?: string, page = 1, limit = 20): Promise<Transaction[]> {
  return walletService.getTransactions(page, limit);
}
export async function depositFunds(_token?: string, currency?: string, amount?: number, description?: string) {
  return walletService.deposit(currency || "USD", amount || 0, description);
}
export async function withdrawFunds(_token?: string, currency?: string, amount?: number, description?: string) {
  return walletService.withdraw(currency || "USD", amount || 0, description);
}
