import api, { mutateBrowserSession, unwrap } from "../api/client";
import type { User, UserSession } from "../types/User.types";

export interface Registration {
  email: string; firstName: string; lastName: string; documentType: string;
  documentNumber: string; dateOfBirth: string; phone: string; password: string;
}
export interface AuthResult { user: User; needsVerification?: boolean; message?: string }
export interface VerifyResult { user: User; fullyVerified: boolean; needsPhone: boolean }
export type LoginResult = { requiresTwoFactor: true } | (AuthResult & { requiresTwoFactor: false });
export interface TotpEnrollment { secret: string; otpauthUrl: string; expiresAt: string }

export const authService = {
  async register(data: Registration) { return unwrap<AuthResult>((await mutateBrowserSession(() => api.post("/auth/register", data))).data); },
  async login(email: string, password: string, twoFactorCode?: string) {
    return unwrap<LoginResult>((await mutateBrowserSession(() => api.post("/auth/login", { email, password, twoFactorCode }))).data);
  },
  async verifyEmail(code: string) { return unwrap<VerifyResult>((await api.post("/auth/verify-email", { code })).data); },
  async verifyPhone(code: string) { return unwrap<VerifyResult>((await api.post("/auth/verify-phone", { code })).data); },
  async resendVerification() { return unwrap<{ message: string }>((await api.post("/auth/resend-verification")).data); },
  async forgotPassword(email: string) { return unwrap<{ message: string }>((await api.post("/auth/forgot-password", { email })).data); },
  async resetPassword(token: string, password: string, email?: string) { await mutateBrowserSession(() => api.post("/auth/reset-password", { token, password, email })); },
  async getProfile() { return unwrap<User>((await api.get("/auth/profile")).data); },
  async logout() { await mutateBrowserSession(() => api.post("/auth/logout")); },
  async setup2FA(password: string) { return unwrap<TotpEnrollment>((await api.post("/auth/2fa/setup", { password })).data); },
  async confirm2FA(code: string) { return unwrap<AuthResult>((await api.post("/auth/2fa/confirm", { code })).data); },
  async disable2FA(password: string, code: string) {
    return unwrap<AuthResult>((await api.post("/auth/2fa/disable", { password, code })).data);
  },
  async changePassword(currentPassword: string, password: string, code?: string) {
    await api.post("/auth/password", { currentPassword, password, code });
  },
  async listSessions() { return unwrap<UserSession[]>((await api.get("/auth/sessions")).data); },
  async revokeSession(id: string) { await api.delete(`/auth/sessions/${id}`); },
  async revokeOtherSessions() { return unwrap<{ revoked: number }>((await api.delete("/auth/sessions/others")).data); },
};
