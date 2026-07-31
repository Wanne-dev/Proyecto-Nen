import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  Index,
} from "typeorm";
import { Wallet } from "./Wallet";
import { AuditLog } from "./AuditLog";
import { Order } from "./Order";
import { VerificationCode } from "./VerificationCode";
import { UserSession } from "./UserSession";
import { Notification } from "./Notification";
import { UserSettings } from "./UserSettings";

export enum UserRole {
  USER = "user",
  ANALYST = "analyst",
  OPERATOR = "operator",
  ADMIN = "admin",
  COMPLIANCE = "compliance",
}

export enum KYCStatus {
  PENDING = "pending",
  VERIFIED = "verified",
  REJECTED = "rejected",
  EXPIRED = "expired",
}

export enum AccountStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  BLOCKED = "blocked",
  DELETED = "deleted",
}

export enum DocumentType {
  CC = "cc",
  CE = "ce",
  TI = "ti",
  PASSPORT = "passport",
  NIT = "nit",
  RUT = "rut",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, length: 255 })
  @Index()
  email: string;

  @Column({ name: "password_hash", length: 255 })
  passwordHash: string;

  @Column({ name: "first_name", length: 100 })
  firstName: string;

  @Column({ name: "last_name", length: 100 })
  lastName: string;

  @Column({ name: "document_type", type: "enum", enum: DocumentType, default: DocumentType.CC })
  documentType: DocumentType;

  @Column({ name: "document_number", unique: true, nullable: true, length: 50 })
  documentNumber: string;

  @Column({ name: "date_of_birth", type: "date", nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true, length: 20 })
  phone: string;

  @Column({ name: "email_verified", default: false })
  emailVerified: boolean;

  @Column({ name: "phone_verified", default: false })
  phoneVerified: boolean;

  @Column({ name: "is_verified", default: false })
  isVerified: boolean;

  @Column({ name: "two_factor_secret", nullable: true, length: 255 })
  twoFactorSecret: string;

  @Column({ name: "two_factor_enabled", default: false })
  twoFactorEnabled: boolean;

  @Column({ name: "failed_login_attempts", default: 0 })
  failedLoginAttempts: number;

  @Column({ name: "locked_until", type: "timestamptz", nullable: true })
  lockedUntil: Date;

  @Column({ name: "reset_password_token", nullable: true, length: 255 })
  resetPasswordToken: string;

  @Column({ name: "reset_password_expires", type: "timestamptz", nullable: true })
  resetPasswordExpires: Date;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: "enum", enum: KYCStatus, default: KYCStatus.PENDING, name: "kyc_status" })
  kycStatus: KYCStatus;

  @Column({ type: "enum", enum: AccountStatus, default: AccountStatus.ACTIVE, name: "account_status" })
  accountStatus: AccountStatus;

  @Column({ name: "last_login_at", type: "timestamptz", nullable: true })
  lastLoginAt: Date;

  @Column({ name: "last_login_ip", nullable: true, length: 45 })
  lastLoginIp: string;

  @Column({ name: "country", default: "CO", length: 3 })
  country: string;

  @Column({ name: "timezone", default: "America/Bogota", length: 50 })
  timezone: string;

  @Column({ name: "preferred_currency", default: "COP", length: 3 })
  preferredCurrency: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet;

  @OneToOne(() => UserSettings, (settings) => settings.user)
  settings: UserSettings;

  @OneToMany(() => AuditLog, (auditLog) => auditLog.user)
  auditLogs: AuditLog[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => VerificationCode, (vc) => vc.user)
  verificationCodes: VerificationCode[];

  @OneToMany(() => UserSession, (session) => session.user)
  sessions: UserSession[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}