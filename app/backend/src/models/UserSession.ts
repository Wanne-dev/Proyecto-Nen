import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from "typeorm";
import { User } from "./User";

export type SessionScope = "access" | "verify";

@Entity("user_sessions")
@Index(["userId", "isActive"])
@Unique("uq_nen_refresh_hash", ["refreshHash"])
export class UserSession {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @Column({ type: "varchar", name: "refresh_hash", length: 64, select: false })
  refreshHash: string;

  @Column({ type: "varchar", length: 12, default: "verify" })
  scope: SessionScope;

  @Column({ type: "boolean", name: "mfa_verified", default: false })
  mfaVerified: boolean;

  @Column({ type: "varchar", name: "device_info", nullable: true, length: 255 })
  deviceInfo: string | null;

  @Column({ name: "user_agent", type: "text", nullable: true })
  userAgent: string | null;

  @Column({ type: "varchar", name: "ip_address", length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: "location", type: "jsonb", nullable: true })
  location: object | null;

  @Column({ type: "boolean", name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @Column({ name: "last_activity_at", type: "timestamptz", nullable: true })
  lastActivityAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.sessions, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: "fk_nen_session_user" })
  user: User;
}