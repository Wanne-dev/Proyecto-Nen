/* Manejo de errores — BANCA NEN */
export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export function getErrorMessage(err: unknown, fallback = "Ocurrió un error inesperado"): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || fallback;
  const maybe = err as Record<string, unknown>;
  if (typeof maybe.message === "string") return maybe.message;
  return fallback;
}

export function getErrorStatus(err: unknown): number | undefined {
  const maybe = err as Record<string, unknown>;
  return typeof maybe.status === "number" ? maybe.status : undefined;
}

export function isNetworkError(err: unknown): boolean {
  const e = err as Record<string, unknown>;
  return e?.code === "ERR_NETWORK" || e?.name === "TypeError" || e?.isAxiosError === true && e?.code !== "ERR_BAD_REQUEST";
}

export function isUnauthorized(err: unknown): boolean {
  return getErrorStatus(err) === 401;
}

export function formatValidationErrors(details: unknown): string {
  if (!details || typeof details !== "object") return "Datos inválidos";
  const entries = Object.entries(details as Record<string, string[]>);
  if (entries.length === 0) return "Datos inválidos";
  return entries.map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(", ") : msgs}`).join(" · ");
}
