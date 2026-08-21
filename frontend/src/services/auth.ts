/* ============================================================
   SERVICIO DE AUTENTICACIÓN — BANCA NEN (API real)
   ============================================================ */
import api, { unwrap } from "../api/client";
import type { User } from "../types/User.types";

export interface LoginResult {
  user: User;
  token: string;
  refreshToken?: string;
  requiresTwoFactor?: boolean;
  message?: string;
}

export const authService = {
  async register(data: {
    email: string; firstName: string; lastName: string; documentType: string;
    documentNumber: string; dateOfBirth: string; phone: string; password: string;
  }): Promise<LoginResult> {
    const res = await api.post("/auth/register", data);
    return unwrap<LoginResult>(res.data);
  },

  async login(email: string, password: string, twoFactorCode?: string): Promise<LoginResult> {
    const res = await api.post("/auth/login", { email, password, twoFactorCode });
    return unwrap<LoginResult>(res.data);
  },

  async verifyEmail(code: string) {
    const res = await api.post("/auth/verify-email", { code });
    return unwrap<any>(res.data);
  },

  async verifyPhone(code: string) {
    const res = await api.post("/auth/verify-phone", { code });
    return unwrap<any>(res.data);
  },

  async resendVerification() {
    const res = await api.post("/auth/resend-verification");
    return unwrap<any>(res.data);
  },

  async forgotPassword(email: string) {
    const res = await api.post("/auth/forgot-password", { email });
    return unwrap<any>(res.data);
  },

  async resetPassword(token: string, password: string) {
    const res = await api.post("/auth/reset-password", { token, password });
    return unwrap<any>(res.data);
  },

  async getProfile(): Promise<User> {
    const res = await api.get("/auth/profile");
    return unwrap<User>(res.data);
  },

  async enable2FA() {
    const res = await api.post("/auth/enable-2fa");
    return unwrap<any>(res.data);
  },

  async disable2FA() {
    const res = await api.post("/auth/disable-2fa");
    return unwrap<any>(res.data);
  },
};
