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

  @Column({ type: "varchar", length: 20 })
  symbol: string;

  @Column({ type: "enum", enum: OrderType })
  type: OrderType;

  @Column({ type: "enum", enum: OrderSide })
  side: OrderSide;

  @Column({ type: "enum", enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: "decimal", precision: 18, scale: 8, nullable: true })
  price: number | null;

  @Column({ name: "stop_price", type: "decimal", precision: 18, scale: 8, nullable: true })
  stopPrice: number | null;

  @Column({ type: "decimal", precision: 18, scale: 8 })
  quantity: number;

  @Column({ name: "filled_quantity", type: "decimal", precision: 18, scale: 8, default: 0 })
  filledQuantity: number;

  @Column({ name: "avg_fill_price", type: "decimal", precision: 18, scale: 8, default: 0 })
  avgFillPrice: number;

  @Column({ name: "ia_score", nullable: true, type: "decimal", precision: 5, scale: 2 })
  iaScore: number | null;

  @Column({ name: "ia_explanation", type: "jsonb", nullable: true })
  iaExplanation: object | null;

  @Column({ type: "varchar", name: "ia_risk_level", nullable: true, length: 20 })
  iaRiskLevel: string | null;

  @Column({ name: "expires_at", type: "timestamptz", nullable: true })
  expiresAt: Date | null;

  @Column({ type: "varchar", name: "time_in_force", length: 10, default: "GTC" })
  timeInForce: string;

  @Column({ type: "decimal", precision: 18, scale: 8, default: 0 })
  commission: number;

  @Column({ type: "varchar", name: "ip_address", nullable: true, length: 45 })
  ipAddress: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: object | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.orders)
  user: User;
}