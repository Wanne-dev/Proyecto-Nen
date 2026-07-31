import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from "typeorm";
import { User } from "./User";

export enum NotificationType {
  TRANSACTION = "transaction",
  SECURITY = "security",
  TRADING = "trading",
  SYSTEM = "system",
  PROMOTION = "promotion",
  KYC = "kyc",
}

@Entity("notifications")
@Index(["userId", "read"])
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @Column({ type: "enum", enum: NotificationType })
  type: NotificationType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: "text" })
  message: string;

  @Column({ default: false })
  read: boolean;

  @Column({ name: "read_at", type: "timestamptz", nullable: true })
  readAt: Date;

  @Column({ name: "action_url", nullable: true, length: 500 })
  actionUrl: string;

  @Column({ name: "metadata", type: "jsonb", nullable: true })
  metadata: object;

  @Column({ name: "priority", default: "normal", length: 20 })
  priority: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.notifications)
  user: User;
}