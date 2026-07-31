import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from "typeorm";
import { Wallet } from "./Wallet";
import { User } from "./User";

export enum TransactionType {
  DEPOSIT = "deposit",
  WITHDRAWAL = "withdrawal",
  TRANSFER_IN = "transfer_in",
  TRANSFER_OUT = "transfer_out",
  TRADE_BUY = "trade_buy",
  TRADE_SELL = "trade_sell",
  FEE = "fee",
  REFUND = "refund",
}

export enum TransactionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  REVERSED = "reversed",
}

@Entity("transactions")
@Index(["userId", "status"])
@Index(["userId", "createdAt"])
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "wallet_id", type: "uuid" })
  walletId: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @Column({ type: "enum", enum: TransactionType })
  type: TransactionType;

  @Column({ type: "enum", enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ type: "decimal", precision: 18, scale: 8 })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ name: "amount_usd", type: "decimal", precision: 18, scale: 2 })
  amountUsd: number;

  @Column({ type: "decimal", precision: 18, scale: 8, default: 0 })
  fee: number;

  @Column({ name: "fee_currency", length: 3, default: "USD" })
  feeCurrency: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ name: "reference_id", unique: true, length: 100 })
  referenceId: string;

  @Column({ name: "ref_hash", length: 64, nullable: true })
  refHash: string;

  @Column({ name: "recipient_user_id", type: "uuid", nullable: true })
  recipientUserId: string;

  @Column({ name: "recipient_wallet_id", type: "uuid", nullable: true })
  recipientWalletId: string;

  @Column({ name: "ip_address", nullable: true, length: 45 })
  ipAddress: string;

  @Column({ name: "ia_score", nullable: true, type: "decimal", precision: 5, scale: 2 })
  iaScore: number;

  @Column({ name: "ia_risk_level", nullable: true, length: 20 })
  iaRiskLevel: string;

  @Column({ name: "metadata", type: "jsonb", nullable: true })
  metadata: object;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  wallet: Wallet;

  @ManyToOne(() => User)
  user: User;
}