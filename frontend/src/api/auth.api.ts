import client from "./client";

export const authApi = {
  register: async (data: any) => {
    const response = await client.post("/auth/register", data);
    return response.data.data;
  },

  login: async (data: any) => {
    const response = await client.post("/auth/login", data);
    return response.data.data;
  },

  verifyEmailCode: async (code: string) => {
    const response = await client.post("/auth/verify-email", { code });
    return response.data.data;
  },

  verifyPhoneCode: async (code: string) => {
    const response = await client.post("/auth/verify-phone", { code });
    return response.data.data;
  },

  resendVerification: async () => {
    const response = await client.post("/auth/resend-verification");
    return response.data.data;
  },

  forgotPassword: async (email: string) => {
    const response = await client.post("/auth/forgot-password", { email });
    return response.data.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await client.post("/auth/reset-password", { token, password });
    return response.data.data;
  },

  getProfile: async () => {
    const response = await client.get("/auth/profile");
    return response.data.data;
  },

  enable2FA: async () => {
    const response = await client.post("/auth/enable-2fa");
    return response.data.data;
  },

  disable2FA: async () => {
    const response = await client.post("/auth/disable-2fa");
    return response.data.data;
  },
};
