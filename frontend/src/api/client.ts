/* ============================================================
   CLIENTE API — BANCA NEN
   Axios unificado contra el backend real (/api/v1 via proxy Vite).
   Adjunta el token JWT, normaliza la envoltura {data} y lanza
   errores legibles. Sin datos mock.
   ============================================================ */
import axios, { AxiosError } from "axios";

const api = axios.create({
  baseURL: "/api/v1", // relativo → Vite proxyea a http://localhost:3000
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

/* Adjuntar token desde el store persistido */
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem("auth-storage");
    if (stored) {
      const parsed = JSON.parse(stored);
      const token = parsed?.state?.token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch { /* ignore */ }
  return config;
});

export class ApiError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function messageFrom(error: AxiosError): string {
  const data = error.response?.data as any;
  if (data?.message) return data.message;
  if (data?.error) return typeof data.error === "string" ? data.error : JSON.stringify(data.error);
  if (error.code === "ERR_NETWORK") return "No hay conexión con el servidor BANCA NEN";
  if (error.code === "ECONNABORTED") return "El servidor tardó demasiado en responder";
  if (error.response) return `Error ${error.response.status}`;
  return error.message || "Error de conexión";
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      try {
        localStorage.removeItem("auth-storage");
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      } catch { /* ignore */ }
    }
    return Promise.reject(new ApiError(messageFrom(error), error.response?.status, error.code));
  }
);

/* Extraer payload de la envoltura {status|success, data} o respuesta cruda */
export function unwrap<T>(payload: any): T {
  if (payload && typeof payload === "object" && "data" in payload) return payload.data as T;
  return payload as T;
}

export default api;
