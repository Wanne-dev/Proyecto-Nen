/* ============================================================
   STORE DE AUTENTICACIÓN — BANCA NEN (API real, sin mock)
   ============================================================ */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService } from "../services/auth";
import type { User } from "../types/User.types";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  pending2FA: boolean;
  needsVerification: boolean;
  login: (email: string, password: string) => Promise<void>;
  verify2FA: (email: string, password: string, code: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  verifyEmailCode: (code: string) => Promise<any>;
  verifyPhoneCode: (code: string) => Promise<any>;
  resendVerification: () => Promise<void>;
  updateProfile: (patch: Partial<User>) => void;
  setUser: (user: User) => void;
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
          const result = await authService.login(email, password);
          if (result.requiresTwoFactor) {
            set({ isLoading: false, pending2FA: true });
            return;
          }
          set({
            user: result.user,
            token: result.token,
            isAuthenticated: true,
            isLoading: false,
            pending2FA: false,
            needsVerification: false,
          });
        } catch (error: any) {
          set({ isLoading: false, error: error?.message || "Error al iniciar sesión" });
          throw error;
        }
      },

      verify2FA: async (email: string, password: string, code: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authService.login(email, password, code);
          set({
            user: result.user,
            token: result.token,
            isAuthenticated: true,
            isLoading: false,
            pending2FA: false,
          });
        } catch (error: any) {
          set({ isLoading: false, error: error?.message || "Código 2FA incorrecto" });
          throw error;
        }
      },

      register: async (data: any) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authService.register(data);
          set({
            user: result.user,
            token: result.token,
            isLoading: false,
            needsVerification: !result.user.isVerified,
            isAuthenticated: true,
          });
        } catch (error: any) {
          set({ isLoading: false, error: error?.message || "Error al registrarse" });
          throw error;
        }
      },

      verifyEmailCode: async (code: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authService.verifyEmail(code);
          const currentUser = get().user;
          if (currentUser) {
            set({ user: { ...currentUser, emailVerified: true, isVerified: result.fullyVerified ?? currentUser.isVerified } });
          }
          set({ isLoading: false });
          return result;
        } catch (error: any) {
          set({ isLoading: false, error: error?.message || "Código incorrecto" });
          throw error;
        }
      },

      verifyPhoneCode: async (code: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authService.verifyPhone(code);
          const currentUser = get().user;
          if (currentUser) {
            set({ user: { ...currentUser, phoneVerified: true, isVerified: result.fullyVerified ?? currentUser.isVerified } });
          }
          set({ isLoading: false });
          return result;
        } catch (error: any) {
          set({ isLoading: false, error: error?.message || "Código incorrecto" });
          throw error;
        }
      },

      resendVerification: async () => {
        try {
          await authService.resendVerification();
        } catch (error: any) {
          set({ error: error?.message || "Error al reenviar códigos" });
        }
      },

      updateProfile: (patch: Partial<User>) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...patch } });
      },

      setUser: (user: User) => set({ user }),

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
