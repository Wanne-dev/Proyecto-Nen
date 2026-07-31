import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from "typeorm";
import { Asset } from "./Asset";

export enum Timeframe {
  MINUTE_1 = "1m",
  MINUTE_5 = "5m",
  MINUTE_15 = "15m",
  HOUR_1 = "1h",
  HOUR_4 = "4h",
  DAY_1 = "1d",
  WEEK_1 = "1w",
  MONTH_1 = "1M",
}

@Entity("market_prices")
@Index(["assetId", "timeframe", "timestamp"], { unique: true })
export class MarketPrice {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "asset_id", type: "uuid" })
  assetId: string;

  @Column({ type: "enum", enum: Timeframe })
  timeframe: Timeframe;

  @Column({ type: "timestamptz" })
  timestamp: Date;

  @Column({ name: "open_price", type: "decimal", precision: 18, scale: 8 })
  openPrice: number;

  @Column({ name: "high_price", type: "decimal", precision: 18, scale: 8 })
  highPrice: number;

  @Column({ name: "low_price", type: "decimal", precision: 18, scale: 8 })
  lowPrice: number;

  @Column({ name: "close_price", type: "decimal", precision: 18, scale: 8 })
  closePrice: number;

  @Column({ type: "decimal", precision: 18, scale: 2 })
  volume: number;

  @Column({ name: "trade_count", default: 0 })
  tradeCount: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @ManyToOne(() => Asset, (asset) => asset.prices)
  asset: Asset;
}