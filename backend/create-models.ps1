$models = @{}

$models["Wallet.ts"] = @"
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
"@

$models["WalletBalance.ts"] = @"
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
"@

$models["Transaction.ts"] = @"
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
"@

$models["Order.ts"] = @"
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from "typeorm";
import { User } from "./User";

export enum OrderType {
  MARKET = "market",
  LIMIT = "limit",
  STOP_LOSS = "stop_loss",
  TAKE_PROFIT = "take_profit",
  STOP_LIMIT = "stop_limit",
  TRAILING_STOP = "trailing_stop",
}

export enum OrderSide {
  BUY = "buy",
  SELL = "sell",
}

export enum OrderStatus {
  PENDING = "pending",
  OPEN = "open",
  PARTIALLY_FILLED = "partially_filled",
  FILLED = "filled",
  CANCELLED = "cancelled",
  REJECTED = "rejected",
  EXPIRED = "expired",
}

@Entity("orders")
@Index(["userId", "status"])
@Index(["symbol", "status"])
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @Column({ length: 20 })
  symbol: string;

  @Column({ type: "enum", enum: OrderType })
  type: OrderType;

  @Column({ type: "enum", enum: OrderSide })
  side: OrderSide;

  @Column({ type: "enum", enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: "decimal", precision: 18, scale: 8, nullable: true })
  price: number;

  @Column({ name: "stop_price", type: "decimal", precision: 18, scale: 8, nullable: true })
  stopPrice: number;

  @Column({ type: "decimal", precision: 18, scale: 8 })
  quantity: number;

  @Column({ name: "filled_quantity", type: "decimal", precision: 18, scale: 8, default: 0 })
  filledQuantity: number;

  @Column({ name: "avg_fill_price", type: "decimal", precision: 18, scale: 8, default: 0 })
  avgFillPrice: number;

  @Column({ name: "ia_score", nullable: true, type: "decimal", precision: 5, scale: 2 })
  iaScore: number;

  @Column({ name: "ia_explanation", type: "jsonb", nullable: true })
  iaExplanation: object;

  @Column({ name: "ia_risk_level", nullable: true, length: 20 })
  iaRiskLevel: string;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt: Date;

  @Column({ name: "time_in_force", length: 10, default: "GTC" })
  timeInForce: string;

  @Column({ type: "decimal", precision: 18, scale: 8, default: 0 })
  commission: number;

  @Column({ name: "ip_address", nullable: true, length: 45 })
  ipAddress: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: object;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.orders)
  user: User;
}
"@

$models["AuditLog.ts"] = @"
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from "typeorm";
import { User } from "./User";

export enum AuditAction {
  LOGIN = "login",
  LOGIN_FAILED = "login_failed",
  LOGOUT = "logout",
  REGISTER = "register",
  PASSWORD_CHANGE = "password_change",
  TWO_FACTOR_ENABLED = "two_factor_enabled",
  TWO_FACTOR_DISABLED = "two_factor_disabled",
  DEPOSIT = "deposit",
  WITHDRAWAL = "withdrawal",
  TRANSFER = "transfer",
  ORDER_CREATED = "order_created",
  ORDER_CANCELLED = "order_cancelled",
  ORDER_FILLED = "order_filled",
  KYC_VERIFIED = "kyc_verified",
  ACCOUNT_BLOCKED = "account_blocked",
  ACCOUNT_UNLOCKED = "account_unlocked",
  SETTINGS_CHANGED = "settings_changed",
  FRAUD_DETECTED = "fraud_detected",
  ADMIN_ACTION = "admin_action",
}

@Entity("audit_logs")
@Index(["userId", "action"])
@Index(["entityType", "entityId"])
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid", nullable: true })
  userId: string;

  @Column({ type: "enum", enum: AuditAction })
  action: AuditAction;

  @Column({ name: "entity_type", length: 50, nullable: true })
  entityType: string;

  @Column({ name: "entity_id", nullable: true, length: 100 })
  entityId: string;

  @Column({ name: "old_values", type: "jsonb", nullable: true })
  oldValues: object;

  @Column({ name: "new_values", type: "jsonb", nullable: true })
  newValues: object;

  @Column({ name: "prev_hash", length: 64, nullable: true })
  prevHash: string;

  @Column({ name: "curr_hash", length: 64, nullable: true })
  currHash: string;

  @Column({ name: "ip_address", length: 45, nullable: true })
  ipAddress: string;

  @Column({ name: "user_agent", type: "text", nullable: true })
  userAgent: string;

  @Column({ name: "risk_score", nullable: true, type: "decimal", precision: 5, scale: 2 })
  riskScore: number;

  @Column({ type: "text", nullable: true })
  details: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.auditLogs)
  user: User;
}
"@

foreach ($key in $models.Keys) {
  $path = Join-Path "C:\Users\sena\Desktop\Proyecto-Nen-main\Proyecto-Nen-main\backend\src\models" $key
  [System.IO.File]::WriteAllText($path, $models[$key])
  Write-Host "Creado: $key"
}

Write-Host "Todos los modelos creados!"