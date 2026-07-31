import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from "typeorm";
import { Wallet } from "./Wallet";

export enum Currency {
  USD = "USD",
  COP = "COP",
  EUR = "EUR",
  BTC = "BTC",
  ETH = "ETH",
  USDC = "USDC",
}

@Entity("wallet_balances")
@Index(["walletId", "currency"], { unique: true })
export class WalletBalance {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "wallet_id", type: "uuid" })
  walletId: string;

  @Column({ type: "enum", enum: Currency })
  currency: Currency;

  @Column({ type: "decimal", precision: 18, scale: 8, default: 0 })
  balance: number;

  @Column({ name: "locked_amount", type: "decimal", precision: 18, scale: 8, default: 0 })
  lockedAmount: number;

  @Column({ name: "usd_rate", type: "decimal", precision: 18, scale: 8, default: 1 })
  usdRate: number;

  @Column({ name: "usd_rate_updated_at", type: "timestamptz", nullable: true })
  usdRateUpdatedAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @ManyToOne(() => Wallet, (wallet) => wallet.balances)
  wallet: Wallet;
}