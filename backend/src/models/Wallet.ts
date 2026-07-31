import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from "typeorm";
import { User } from "./User";
import { WalletBalance } from "./WalletBalance";
import { Transaction } from "./Transaction";

export enum WalletType {
  MAIN = "main",
  SAVINGS = "savings",
  DEMO = "demo",
}

@Entity("wallets")
export class Wallet {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @Column({ type: "enum", enum: WalletType, default: WalletType.MAIN })
  type: WalletType;

  @Column({ name: "total_balance_usd", type: "decimal", precision: 18, scale: 2, default: 0 })
  totalBalanceUsd: number;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "daily_withdrawal_limit", type: "decimal", precision: 18, scale: 2, default: 5000 })
  dailyWithdrawalLimit: number;

  @Column({ name: "daily_withdrawn", type: "decimal", precision: 18, scale: 2, default: 0 })
  dailyWithdrawn: number;

  @Column({ name: "daily_withdrawn_reset", type: "timestamptz", nullable: true })
  dailyWithdrawnReset: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.wallet)
  user: User;

  @OneToMany(() => WalletBalance, (balance) => balance.wallet)
  balances: WalletBalance[];

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions: Transaction[];
}