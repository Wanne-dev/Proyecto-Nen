import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "../api/auth.api";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  balance: number;
  isVerified: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  phone?: string;
  documentType: string;
  documentNumber: string;
  dateOfBirth: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  pending2FA: boolean;
  needsVerification: boolean;
  login: (email: string, password: string) => Promise<void>;
  verify2FA: (email: string, code: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  verifyEmailCode: (code: string) => Promise<any>;
  verifyPhoneCode: (code: string) => Promise<any>;
  resendVerification: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setPending2FA: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      pending2FA: false,
      needsVerification: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authApi.login({ email, password });
          if (result.requiresTwoFactor) {
            set({ isLoading: false, pending2FA: true });
            return;
          }
          set({
            user: result.user as User,
            token: result.token,
            isAuthenticated: true,
            isLoading: false,
            pending2FA: false,
            needsVerification: false,
          });
        } catch (error: any) {
          set({ isLoading: false, error: error.message || "Error al iniciar sesion" });
          throw error;
        }
      },

      verify2FA: async (email: string, code: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authApi.login({ email, password: "", twoFactorCode: code });
          set({
            user: result.user as User,
            token: result.token,
            isAuthenticated: true,
            isLoading: false,
            pending2FA: false,
          });
        } catch (error: any) {
          set({ isLoading: false, error: error.message || "Codigo 2FA incorrecto" });
          throw error;
        }
      },

      register: async (data: any) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authApi.register(data);
          set({
            user: result.user as User,
            token: result.token,
            isLoading: false,
            needsVerification: true,
            isAuthenticated: true,
          });
        } catch (error: any) {
          set({ isLoading: false, error: error.message || "Error al registrarse" });
          throw error;
        }
      },

      verifyEmailCode: async (code: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authApi.verifyEmailCode(code);
          const currentUser = get().user;
          if (currentUser) {
            set({ user: { ...currentUser, emailVerified: result.emailVerified, isVerified: result.fullyVerified } as User });
          }
          set({ isLoading: false });
          return result;
        } catch (error: any) {
          set({ isLoading: false, error: error.message || "Codigo incorrecto" });
          throw error;
        }
      },

      verifyPhoneCode: async (code: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authApi.verifyPhoneCode(code);
          const currentUser = get().user;
          if (currentUser) {
            set({ user: { ...currentUser, phoneVerified: result.phoneVerified, isVerified: result.fullyVerified } as User });
          }
          set({ isLoading: false });
          return result;
        } catch (error: any) {
          set({ isLoading: false, error: error.message || "Codigo incorrecto" });
          throw error;
        }
      },

      resendVerification: async () => {
        try {
          await authApi.resendVerification();
        } catch (error: any) {
          set({ error: error.message || "Error al reenviar codigos" });
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          pending2FA: false,
          needsVerification: false,
        });
      },

      clearError: () => set({ error: null }),
      setPending2FA: (val: boolean) => set({ pending2FA: val }),
    }),
    { name: "auth-storage" }
  )
);
