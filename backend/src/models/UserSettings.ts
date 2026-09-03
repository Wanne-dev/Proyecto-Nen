import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from "typeorm";
import { User } from "./User";

@Entity("user_settings")
export class UserSettings {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "user_id", type: "uuid", unique: true })
  userId: string;

  @Column({ type: "varchar", name: "theme", default: "dark", length: 10 })
  theme: string;

  @Column({ type: "varchar", name: "language", default: "es", length: 5 })
  language: string;

  @Column({ type: "varchar", name: "currency_display", default: "COP", length: 3 })
  currencyDisplay: string;

  @Column({ type: "boolean", name: "email_notifications", default: true })
  emailNotifications: boolean;

  @Column({ type: "boolean", name: "push_notifications", default: true })
  pushNotifications: boolean;

  @Column({ type: "boolean", name: "sms_notifications", default: false })
  smsNotifications: boolean;

  @Column({ type: "varchar", name: "two_factor_method", default: "email", length: 20 })
  twoFactorMethod: string;

  @Column({ type: "boolean", name: "biometric_enabled", default: false })
  biometricEnabled: boolean;

  @Column({ type: "boolean", name: "trading_confirmations", default: true })
  tradingConfirmations: boolean;

  @Column({ type: "varchar", name: "risk_tolerance", default: "moderate", length: 20 })
  riskTolerance: string;

  @Column({ type: "integer", name: "auto_logout_minutes", default: 30 })
  autoLogoutMinutes: number;

  @Column({ type: "boolean", name: "hide_small_balances", default: false })
  hideSmallBalances: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.settings)
  user: User;
}