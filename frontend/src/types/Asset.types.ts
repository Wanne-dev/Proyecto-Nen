/* Tipos de Activos Financieros — BANCA NEN */
export type AssetType = "crypto" | "stock" | "forex" | "commodity";

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  price: number;
  priceChange24h: number;
  priceChange7d?: number;
  marketCap?: number;
  volume24h?: number;
  image?: string;
  marketOpen?: boolean;
  high24h?: number;
  low24h?: number;
  currency: string;
}

export interface PricePoint {
  time: number;
  value: number;
}
