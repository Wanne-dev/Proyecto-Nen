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