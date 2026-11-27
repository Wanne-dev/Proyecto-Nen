import { create } from "zustand";
import { ApiError, onSessionExpired, sessionChanged } from "../api/client";
import { authService, type Registration, type VerifyResult } from "../services/auth";
import type { User } from "../types/User.types";
import { useTradingStore } from "./trading.slice";
import { useWalletStore } from "./wallet.slice";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  ready: boolean;
  unavailable: string | null;
  isLoading: boolean;
  error: string | null;
  pending2FA: boolean;
  verificationMessage: string;
  restore: () => Promise<void>;
  login: (email: string, password: string, code?: string) => Promise<void>;
  register: (data: Registration) => Promise<void>;
  verifyEmailCode: (code: string) => Promise<VerifyResult>;
  verifyPhoneCode: (code: string) => Promise<VerifyResult>;
  resendVerification: () => Promise<{ message: string } | null>;
  setUser: (user: User) => void;
  endLocally: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
  setPending2FA: (value: boolean) => void;
}

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "No se pudo completar la solicitud";
let restoring: Promise<void> | null = null;
let identityRevision = 0;
const tabs = typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
  ? new BroadcastChannel("banca-nen-session") : null;

export const useAuthStore = create<AuthState>()((set, get) => {
  function replaceUser(user: User | null, newSession = false) {
    if (newSession || user?.id !== get().user?.id) {
      identityRevision += 1;
      sessionChanged();
      useWalletStore.getState().reset();
      useTradingStore.getState().reset();
    }
    set({ user, ready: true, isAuthenticated: !!user, pending2FA: false, unavailable: null, error: null });
  }
  async function doing<T>(action: () => Promise<T>): Promise<T> {
    set({ isLoading: true, error: null });
    try { return await action(); }
    catch (error) { set({ error: errorMessage(error) }); throw error; }
    finally { set({ isLoading: false }); }
  }
  const verify = (channel: "email" | "phone") => (code: string) => doing(async () => {
    const result = await (channel === "email" ? authService.verifyEmail(code) : authService.verifyPhone(code));
    replaceUser(result.user, result.fullyVerified);
    if (result.fullyVerified) tabs?.postMessage("changed");
    return result;
  });
  return {
    user: null, isAuthenticated: false, ready: false, unavailable: null, isLoading: false,
    error: null, pending2FA: false, verificationMessage: "",
    restore: () => {
      if (restoring) return restoring;
      // Eliminar de versiones anteriores, nunca leer ni reutilizar su token.
      try { localStorage.removeItem("auth-storage"); } catch { /* almacenamiento deshabilitado */ }
      const revision = identityRevision;
      restoring = authService.getProfile().then((user) => {
        if (revision !== identityRevision) return;
        if (user.id === get().user?.id) set({ user, ready: true, unavailable: null });
        else replaceUser(user);
      }).catch((error: unknown) => {
        if (revision !== identityRevision) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          if (get().user || !get().ready || get().unavailable) replaceUser(null);
        }
        else if (!get().ready || get().unavailable) set({ ready: true, unavailable: errorMessage(error) });
      }).finally(() => { restoring = null; });
      return restoring;
    },
    login: (email, password, code) => doing(async () => {
      const result = await authService.login(email, password, code);
      if (result.requiresTwoFactor) { set({ pending2FA: true }); return; }
      replaceUser(result.user, true);
      tabs?.postMessage("changed");
    }),
    register: (data) => doing(async () => {
      const result = await authService.register(data);
      replaceUser(result.user, true);
      set({ verificationMessage: result.message ?? "" });
      tabs?.postMessage("changed");
    }),
    verifyEmailCode: verify("email"), verifyPhoneCode: verify("phone"),
    resendVerification: async () => {
      try { return await doing(authService.resendVerification); } catch { return null; }
    },
    setUser: (user) => replaceUser(user),
    endLocally: () => { replaceUser(null, true); set({ verificationMessage: "" }); tabs?.postMessage("changed"); },
    logout: () => doing(async () => { await authService.logout(); get().endLocally(); }),
    clearError: () => set({ error: null }),
    setPending2FA: (pending2FA) => set({ pending2FA, error: null }),
  };
});
onSessionExpired(() => {
  const state = useAuthStore.getState();
  if (state.user) state.endLocally();
});
if (tabs) tabs.onmessage = () => { void useAuthStore.getState().restore(); };
