/* Tipos de Usuario — BANCA NEN (shape del backend real) */
export type UserRole = "user" | "analyst" | "operator" | "admin" | "compliance";

export type AccountStatus = "active" | "suspended" | "blocked" | "deleted";

export type KYCStatus = "pending" | "verified" | "rejected" | "expired";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  kycStatus: KYCStatus;
  accountStatus: AccountStatus;
  isVerified: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  phone?: string;
  documentType?: string;
  documentNumber?: string;
  dateOfBirth?: string;
  country?: string;
  timezone?: string;
  preferredCurrency?: string;
  createdAt?: string;
  lastLoginAt?: string | null;
}

export const isStaffRole = (role?: string) =>
  role === "admin" || role === "operator" || role === "analyst";

export interface UserSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  createdAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
  isBlocked: boolean;
}

export interface SecurityQuestion {
  id: string;
  question: string;
  answer?: string;
  updatedAt: string;
}
