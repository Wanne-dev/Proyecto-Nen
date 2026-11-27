/* Tipos de Billetera — BANCA NEN */
export type CurrencyCode = "USD" | "COP" | "EUR" | "BTC" | "ETH" | "USDC";

export interface WalletBalance {
  id: string;
  currency: CurrencyCode;
  balance: string;
  lockedAmount: string;
  usdRate: string;
}

export interface WalletData {
  id: string;
  userId: string;
  type: string;
  totalBalanceUsd: string;
  isActive: boolean;
  balances: WalletBalance[];
}

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "transfer_in"
  | "transfer_out"
  | "trade_buy"
  | "trade_sell"
  | "fee"
  | "refund";

export type TransactionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "reversed";

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: string;
  currency: CurrencyCode;
  fee: string;
  description: string;
  referenceId: string;
  createdAt: string;
  hash?: string;
  counterparty?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  holderName: string;
  isDefault: boolean;
}
