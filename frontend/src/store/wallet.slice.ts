/* ============================================================
   STORE DE BILLETERA — BANCA NEN (API real)
   ============================================================ */
import { create } from "zustand";
import { walletService, type WalletData, type Transaction } from "../services/wallet";

interface WalletState {
  wallet: WalletData | null;
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  deposit: (currency: string, amount: number, description?: string) => Promise<void>;
  withdraw: (currency: string, amount: number, description?: string) => Promise<void>;
  reset: () => void;
}

export const useWalletStore = create<WalletState>()((set, get) => ({
  wallet: null,
  transactions: [],
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const [wallet, transactions] = await Promise.all([
        walletService.getWallet(),
        walletService.getTransactions(1, 40),
      ]);
      set({ wallet, transactions, loading: false });
    } catch (e: any) {
      set({ error: e?.message || "Error cargando billetera", loading: false });
    }
  },

  deposit: async (currency: string, amount: number, description?: string) => {
    await walletService.deposit(currency, amount, description);
    await get().refresh();
  },

  withdraw: async (currency: string, amount: number, description?: string) => {
    await walletService.withdraw(currency, amount, description);
    await get().refresh();
  },

  reset: () => set({ wallet: null, transactions: [], error: null }),
}));
