/* ============================================================
   SERVICIO DE ADMINISTRACIÓN — BANCA NEN (API real)
   ============================================================ */
import api, { unwrap } from "../api/client";

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  accountStatus: string;
  kycStatus: string;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  country: string;
  createdAt: string;
  lastLoginAt: string | null;
  balanceUsd: number;
  tradesCount: number;
}

export interface AuditLog {
  id: string;
  action: string;
  category: string;
  severity: "info" | "warning" | "danger";
  details: string;
  actor: string;
  ip: string;
  createdAt: string;
  hash: string;
  prevHash: string;
}

export interface SystemSettings {
  platformName: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  kycRequired: boolean;
  defaultCurrency: string;
  maxWithdrawalDaily: number;
  maxDepositDaily: number;
  tradingFee: number;
  withdrawalFee: number;
  minWithdrawal: number;
  minDeposit: number;
  minTradeUsd: number;
  maxLeverage: number;
  twoFactorRequired: boolean;
  sessionTimeoutMin: number;
  suspiciousThreshold: number;
  allowedCountries: string[];
  languages: string[];
  timezone: string;
  notifications: { email: boolean; sms: boolean; push: boolean; securityAlerts: boolean; marketAlerts: boolean };
}

const ACTION_CATEGORY: Record<string, string> = {
  login: "Autenticación", login_failed: "Autenticación", logout: "Autenticación",
  register: "Usuarios", password_change: "Seguridad",
  two_factor_enabled: "Seguridad", two_factor_disabled: "Seguridad",
  deposit: "Billetera", withdrawal: "Billetera", transfer: "Transferencias",
  order_created: "Trading", order_cancelled: "Trading", order_filled: "Trading",
  kyc_verified: "KYC", account_blocked: "Seguridad", account_unlocked: "Seguridad",
  settings_changed: "Administración", fraud_detected: "Seguridad", admin_action: "Administración",
};

function severityOf(log: any): "info" | "warning" | "danger" {
  const risk = Number(log.risk_score) || 0;
  if (risk >= 0.7) return "danger";
  if (risk >= 0.4) return "warning";
  if (["login_failed", "account_blocked", "fraud_detected"].includes(log.action)) return "danger";
  if (["two_factor_disabled", "password_change"].includes(log.action)) return "warning";
  return "info";
}

function normalizeAudit(raw: any): AuditLog {
  return {
    id: raw.id,
    action: raw.action,
    category: raw.entityType || ACTION_CATEGORY[raw.action] || "Sistema",
    severity: severityOf(raw),
    details: raw.details || raw.action,
    actor: raw.user?.email ? `${raw.user.firstName || ""} ${raw.user.lastName || ""} <${raw.user.email}>`.trim() : "Sistema",
    ip: raw.ipAddress || "-",
    createdAt: raw.createdAt,
    hash: raw.currHash || "-",
    prevHash: raw.prevHash || "-",
  };
}

export const adminService = {
  async getUsers(filters?: { search?: string; role?: string; status?: string }): Promise<AdminUser[]> {
    const res = await api.get("/admin/users", { params: filters });
    return unwrap<AdminUser[]>(res.data) || [];
  },

  async updateUserStatus(id: string, status: string): Promise<any> {
    const res = await api.patch(`/admin/users/${id}/status`, { status });
    return unwrap<any>(res.data);
  },

  async updateUserRole(id: string, role: string): Promise<any> {
    const res = await api.patch(`/admin/users/${id}/role`, { role });
    return unwrap<any>(res.data);
  },

  async getAuditLogs(filters?: { search?: string; category?: string; severity?: string }): Promise<AuditLog[]> {
    const res = await api.get("/admin/audit", { params: filters });
    const data = unwrap<{ logs: any[]; total: number }>(res.data);
    return (data?.logs || []).map(normalizeAudit);
  },

  async getStats(): Promise<any> {
    const res = await api.get("/admin/stats");
    return unwrap<any>(res.data);
  },

  async getChartData(range: "7d" | "30d" | "90d" = "30d"): Promise<any[]> {
    const res = await api.get("/admin/chart", { params: { range } });
    return unwrap<any[]>(res.data) || [];
  },

  async getSettings(): Promise<SystemSettings> {
    const res = await api.get("/admin/settings");
    return unwrap<SystemSettings>(res.data);
  },

  async saveSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await api.put("/admin/settings", settings);
    return unwrap<SystemSettings>(res.data);
  },
};
