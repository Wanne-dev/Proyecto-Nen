import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { MarketPrice } from "./MarketPrice";

export enum AssetType {
  CRYPTO = "crypto",
  STOCK = "stock",
  FOREX = "forex",
  COMMODITY = "commodity",
  INDEX = "index",
}

@Entity("assets")
export class Asset {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, length: 20 })
  symbol: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: "enum", enum: AssetType })
  type: AssetType;

  @Column({ name: "current_price", type: "decimal", precision: 18, scale: 8 })
  currentPrice: number;

  @Column({ name: "previous_close", type: "decimal", precision: 18, scale: 8, nullable: true })
  previousClose: number;

  @Column({ name: "daily_change", type: "decimal", precision: 10, scale: 4, default: 0 })
  dailyChange: number;

  @Column({ name: "daily_change_percent", type: "decimal", precision: 10, scale: 4, default: 0 })
  dailyChangePercent: number;

  @Column({ name: "volume_24h", type: "decimal", precision: 18, scale: 2, default: 0 })
  volume24h: number;

  @Column({ name: "market_cap", type: "decimal", precision: 18, scale: 2, nullable: true })
  marketCap: number;

  @Column({ name: "high_24h", type: "decimal", precision: 18, scale: 8, nullable: true })
  high24h: number;

  @Column({ name: "low_24h", type: "decimal", precision: 18, scale: 8, nullable: true })
  low24h: number;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "logo_url", nullable: true, length: 500 })
  logoUrl: string;

  @Column({ name: "description", type: "text", nullable: true })
  description: string;

  @Column({ name: "metadata", type: "jsonb", nullable: true })
  metadata: object;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @OneToMany(() => MarketPrice, (price) => price.asset)
  prices: MarketPrice[];
}