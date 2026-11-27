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
  chainPosition: string | null;
}

export interface SystemSettings { allowRegistration: boolean }
export type AuditIntegrity = { valid: boolean; checked: number; legacy: number; firstInvalid: string | null };
export type AdminUserChange = Omit<AdminUser, "balanceUsd" | "tradesCount">;
export interface AdminStats {
  totalUsers: number; activeUsers24h: number; openOrders: number; depositsToday: number;
  totalTransactions: number; totalVolumeUsd30d: number; pendingKyc: number; blockedAccounts: number;
}
export interface AdminDay { date: string; users: number; volume: number; deposits: number; withdrawals: number; trades: number }

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
  const risk = Number(log.riskScore) || 0;
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
    chainPosition: raw.chainPosition ?? null,
  };
}

export const adminService = {
  async getUsers(filters?: { search?: string; role?: string; status?: string }): Promise<AdminUser[]> {
    const res = await api.get("/admin/users", { params: filters });
    return unwrap<AdminUser[]>(res.data) || [];
  },

  async updateUserStatus(id: string, status: string): Promise<AdminUserChange> {
    const res = await api.patch(`/admin/users/${id}/status`, { status });
    return unwrap<AdminUserChange>(res.data);
  },

  async updateUserRole(id: string, role: string): Promise<AdminUserChange> {
    const res = await api.patch(`/admin/users/${id}/role`, { role });
    return unwrap<AdminUserChange>(res.data);
  },

  async getAuditLogs(filters?: { search?: string; category?: string; severity?: string }): Promise<{ logs: AuditLog[]; total: number }> {
    const res = await api.get("/admin/audit", { params: filters });
    const data = unwrap<{ logs: any[]; total: number }>(res.data);
    return { logs: (data.logs || []).map(normalizeAudit), total: data.total };
  },

  async getAuditIntegrity(): Promise<AuditIntegrity> {
    return unwrap<AuditIntegrity>((await api.get("/admin/audit/integrity")).data);
  },

  async getStats(): Promise<AdminStats> {
    const res = await api.get("/admin/stats");
    return unwrap<AdminStats>(res.data);
  },

  async getChartData(range: "7d" | "30d" | "90d" = "30d"): Promise<AdminDay[]> {
    const res = await api.get("/admin/chart", { params: { range } });
    return unwrap<AdminDay[]>(res.data) || [];
  },

  async getSettings(): Promise<SystemSettings> {
    const res = await api.get("/admin/settings");
    return unwrap<SystemSettings>(res.data);
  },

  async saveSettings(settings: SystemSettings): Promise<SystemSettings> {
    const res = await api.put("/admin/settings", settings);
    return unwrap<SystemSettings>(res.data);
  },
};
