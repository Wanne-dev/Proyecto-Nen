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

  @Column({ name: "theme", default: "dark", length: 10 })
  theme: string;

  @Column({ name: "language", default: "es", length: 5 })
  language: string;

  @Column({ name: "currency_display", default: "COP", length: 3 })
  currencyDisplay: string;

  @Column({ name: "email_notifications", default: true })
  emailNotifications: boolean;

  @Column({ name: "push_notifications", default: true })
  pushNotifications: boolean;

  @Column({ name: "sms_notifications", default: false })
  smsNotifications: boolean;

  @Column({ name: "two_factor_method", default: "email", length: 20 })
  twoFactorMethod: string;

  @Column({ name: "biometric_enabled", default: false })
  biometricEnabled: boolean;

  @Column({ name: "trading_confirmations", default: true })
  tradingConfirmations: boolean;

  @Column({ name: "risk_tolerance", default: "moderate", length: 20 })
  riskTolerance: string;

  @Column({ name: "auto_logout_minutes", default: 30 })
  autoLogoutMinutes: number;

  @Column({ name: "hide_small_balances", default: false })
  hideSmallBalances: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.settings)
  user: User;
}