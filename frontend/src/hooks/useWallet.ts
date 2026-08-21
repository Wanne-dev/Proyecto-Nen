/* Hook: billetera — BANCA NEN */
import { useEffect } from "react";
import { useWalletStore } from "../store/wallet.slice";

export function useWallet() {
  const wallet = useWalletStore((s) => s.wallet);
  const transactions = useWalletStore((s) => s.transactions);
  const loading = useWalletStore((s) => s.loading);
  const error = useWalletStore((s) => s.error);
  const refresh = useWalletStore((s) => s.refresh);
  const deposit = useWalletStore((s) => s.deposit);
  const withdraw = useWalletStore((s) => s.withdraw);

  useEffect(() => {
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const balanceOf = (currency: string): number => {
    const b = wallet?.balances?.find((x) => x.currency === currency);
    return b ? Number(b.balance) : 0;
  };

  const totalUsd = Number(wallet?.totalBalanceUsd || 0);

  return { wallet, transactions, loading, error, refresh, deposit, withdraw, balanceOf, totalUsd };
}
