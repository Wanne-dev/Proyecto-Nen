/* ============================================================
   STORE DE UI — BANCA NEN
   Estado global de interfaz: sidebar, tema, modo demo, toasts.
   ============================================================ */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message?: string;
}

interface UIState {
  sidebarOpen: boolean;
  theme: "dark" | "light";
  isDemoMode: boolean;
  toasts: Toast[];
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setDemoMode: (v: boolean) => void;
  toast: (type: Toast["type"], title: string, message?: string) => void;
  dismissToast: (id: string) => void;
}

let toastId = 0;

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      theme: "dark",
      isDemoMode: true,
      toasts: [],
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setDemoMode: (v) => set({ isDemoMode: v }),
      toast: (type, title, message) => {
        const id = "toast-" + ++toastId;
        set({ toasts: [...get().toasts, { id, type, title, message }] });
        setTimeout(() => get().dismissToast(id), 4200);
      },
      dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
    }),
    { name: "ui-storage" }
  )
);
