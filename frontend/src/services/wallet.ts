const BASE = "/api/v1";

export interface WalletBalance {
  id: string;
  currency: string;
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

export interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: string;
  currency: string;
  fee: string;
  description: string;
  referenceId: string;
  createdAt: string;
}

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: "Bearer " + token };
}

export async function getWallet(token: string): Promise<WalletData> {
  const res = await fetch(BASE + "/wallet", { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Wallet error: " + res.status);
  const json = await res.json();
  return json.data;
}

export async function depositFunds(token: string, currency: string, amount: number, description?: string) {
  const res = await fetch(BASE + "/wallet/deposit", {
    method: "POST", headers: authHeaders(token),
    body: JSON.stringify({ currency, amount, description }),
  });
  if (!res.ok) throw new Error("Deposit error: " + res.status);
  const json = await res.json();
  return json.data;
}

export async function withdrawFunds(token: string, currency: string, amount: number, description?: string) {
  const res = await fetch(BASE + "/wallet/withdraw", {
    method: "POST", headers: authHeaders(token),
    body: JSON.stringify({ currency, amount, description }),
  });
  if (!res.ok) {
    try { const json = await res.json(); throw new Error(json.message || "Withdraw error"); } catch (e) { throw e; }
  }
  const json = await res.json();
  return json.data;
}

export async function getTransactions(token: string, page = 1, limit = 20): Promise<Transaction[]> {
  const res = await fetch(BASE + "/wallet/transactions?page=" + page + "&limit=" + limit, { headers: authHeaders(token) });
  if (!res.ok) throw new Error("Transactions error: " + res.status);
  const json = await res.json();
  return json.data;
}