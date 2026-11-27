/* ============================================================
   STORE DE BILLETERA — BANCA NEN (API real)
   ============================================================ */
import { create } from "zustand";
import {
  walletService,
  type WalletData,
  type Transaction,
  type TransactionSummary,
  type WalletMutation,
} from "../services/wallet";

export interface WalletSummaryComparison {
  current: TransactionSummary;
  previous: TransactionSummary;
}

interface WalletState {
  wallet: WalletData | null;
  transactions: Transaction[];
  summary: WalletSummaryComparison | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deposit: (currency: string, amount: number, description?: string) => Promise<WalletMutation>;
  withdraw: (currency: string, amount: number, description?: string) => Promise<WalletMutation>;
  reset: () => void;
}

export const useWalletStore = create<WalletState>()((set, get) => ({
  wallet: null,
  transactions: [],
  summary: null,
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const [wallet, transactions, current, last60] = await Promise.all([
        walletService.getWallet(),
        walletService.getTransactions(1, 40),
        walletService.getSummary(30),
        walletService.getSummary(60),
      ]);
      const previous: TransactionSummary = {
        days: 30,
        deposits: Math.max(0, last60.deposits - current.deposits),
        withdrawals: Math.max(0, last60.withdrawals - current.withdrawals),
        income: Math.max(0, last60.income - current.income),
        expense: Math.max(0, last60.expense - current.expense),
        volume: Math.max(0, last60.volume - current.volume),
        count: Math.max(0, last60.count - current.count),
      };
      set({ wallet, transactions, summary: { current, previous }, loading: false });
    } catch (e: any) {
      set({ error: e?.message || "Error cargando billetera", loading: false });
    }
  },

  deposit: async (currency: string, amount: number, description?: string) => {
    const result = await walletService.deposit(currency, amount, description);
    await get().refresh();
    return result;
  },

  withdraw: async (currency: string, amount: number, description?: string) => {
    const result = await walletService.withdraw(currency, amount, description);
    await get().refresh();
    return result;
  },

  reset: () => set({ wallet: null, transactions: [], summary: null, loading: false, error: null }),
}));
