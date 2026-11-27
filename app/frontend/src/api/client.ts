import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const api = axios.create({ baseURL: "/api/v1", headers: { "Content-Type": "application/json" }, timeout: 20_000, withCredentials: true });
const sessionClient = axios.create({ baseURL: "/api/v1", headers: { "Content-Type": "application/json" }, timeout: 20_000, withCredentials: true });
const publicAuth = /^\/auth\/(?:login|register|forgot-password|reset-password|logout|refresh)$/;
type SessionRequest = InternalAxiosRequestConfig & { sessionGeneration?: number; renewed?: boolean };
let generation = 0;
let onExpired: (() => void) | undefined;
let renewal: Promise<void> | null = null;

export function sessionChanged() { generation += 1; }
export function onSessionExpired(callback: () => void) { onExpired = callback; }

export class ApiError extends Error {
  constructor(message: string, public status?: number, public code?: string) { super(message); }
}

function asError(error: unknown) {
  if (error instanceof ApiError) return error;
  if (!axios.isAxiosError(error)) return new ApiError(error instanceof Error ? error.message : "Error de conexión");
  const data = error.response?.data as { message?: unknown; error?: unknown } | undefined;
  const message = typeof data?.message === "string" ? data.message : typeof data?.error === "string" ? data.error :
    error.code === "ERR_NETWORK" ? "No hay conexión con BANCA NEN" :
    error.code === "ECONNABORTED" ? "El servidor tardó demasiado en responder" :
    error.response ? `Error ${error.response.status}` : "Error de conexión";
  return new ApiError(message, error.response?.status, error.code);
}

/** Serializa renovación y cambios de cookie entre pestañas compatibles. */
export async function mutateBrowserSession<T>(operation: () => Promise<T>, awaitRenewal = true): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return await navigator.locks.request("banca-nen-session-cookie", operation);
  }
  if (awaitRenewal && renewal) await renewal.catch(() => {});
  return operation();
}

/** La rotación comparte una solicitud por pestaña; Web Locks evita renovaciones simultáneas entre pestañas compatibles. */
function renewSession(expectedGeneration: number) {
  if (!renewal) {
    const attempt = async () => {
      if (expectedGeneration !== generation) throw new ApiError("La sesión cambió", 401);
      await sessionClient.post("/auth/refresh");
    };
    renewal = mutateBrowserSession(attempt, false).finally(() => { renewal = null; });
  }
  return renewal;
}

api.interceptors.request.use((request: SessionRequest) => {
  request.sessionGeneration ??= generation;
  return request;
});
api.interceptors.response.use(
  (response) => {
    const config = response.config as SessionRequest;
    if (!publicAuth.test(config.url ?? "") && config.sessionGeneration !== generation) throw new ApiError("La sesión cambió", 401);
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as SessionRequest | undefined;
    if (error.response?.status !== 401 || !config || publicAuth.test(config.url ?? "") || config.sessionGeneration !== generation) throw asError(error);
    if (config.renewed) { onExpired?.(); throw asError(error); }
    config.renewed = true;
    try { await renewSession(generation); }
    catch (cause) {
      const failure = asError(cause);
      if (failure.status === 401 && config.sessionGeneration === generation) onExpired?.();
      throw failure;
    }
    if (config.sessionGeneration !== generation) throw new ApiError("La sesión cambió", 401);
    // Solo se reintenta un 401 del servidor, nunca un timeout ni una escritura de resultado incierto.
    return api.request(config);
  }
);

export function unwrap<T>(payload: unknown): T {
  return (payload && typeof payload === "object" && "data" in payload ? payload.data : payload) as T;
}
export default api;
