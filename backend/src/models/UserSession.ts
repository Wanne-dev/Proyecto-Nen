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

@Entity("user_sessions")
@Index(["userId", "isActive"])
export class UserSession {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @Column({ name: "refresh_token", length: 500, unique: true })
  refreshToken: string;

  @Column({ name: "device_info", nullable: true, length: 255 })
  deviceInfo: string;

  @Column({ name: "user_agent", type: "text", nullable: true })
  userAgent: string;

  @Column({ name: "ip_address", length: 45, nullable: true })
  ipAddress: string;

  @Column({ name: "location", type: "jsonb", nullable: true })
  location: object;

  @Column({ name: "is_active", default: true })
  isActive: boolean;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @Column({ name: "last_activity_at", type: "timestamptz", nullable: true })
  lastActivityAt: Date;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.sessions)
  user: User;
}