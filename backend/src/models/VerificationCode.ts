import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from "typeorm";
import { User } from "./User";

export enum CodeType {
  EMAIL_VERIFICATION = "email_verification",
  PHONE_VERIFICATION = "phone_verification",
  TWO_FACTOR = "two_factor",
  PASSWORD_RESET = "password_reset",
  LOGIN_VERIFICATION = "login_verification",
}

@Entity("verification_codes")
@Index(["userId", "type", "used"])
export class VerificationCode {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid" })
  userId: string;

  @Column({ type: "enum", enum: CodeType })
  type: CodeType;

  @Column({ name: "code", length: 6 })
  code: string;

  @Column({ name: "target", length: 255, nullable: true })
  target: string;

  @Column({ default: false })
  used: boolean;

  @Column({ name: "attempts", default: 0 })
  attempts: number;

  @Column({ name: "max_attempts", default: 5 })
  maxAttempts: number;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt: Date;

  @Column({ name: "used_at", type: "timestamptz", nullable: true })
  usedAt: Date;

  @Column({ name: "ip_address", nullable: true, length: 45 })
  ipAddress: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.verificationCodes)
  user: User;
}