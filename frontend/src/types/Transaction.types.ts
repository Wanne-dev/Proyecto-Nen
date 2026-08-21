/* Tipos de Transacción — BANCA NEN */
import type { CurrencyCode, TransactionStatus, TransactionType } from "./Wallet.types";

export interface Transaction {
  id: string;
  referenceId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: CurrencyCode;
  fee: number;
  description?: string;
  counterparty?: string;
  hash?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TransactionFilters {
  type?: TransactionType | "all";
  status?: TransactionStatus | "all";
  currency?: CurrencyCode | "all";
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface TransferRequest {
  destinationEmail: string;
  currency: CurrencyCode;
  amount: number;
  note?: string;
  otpCode?: string;
}
