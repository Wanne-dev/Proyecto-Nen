/* Utilidades de API — BANCA NEN */
import type { Paginated, PaginationParams } from "../types/Api.types";

export function buildQuery(params: PaginationParams): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  });
  const s = q.toString();
  return s ? "?" + s : "";
}

export function emptyPaginated<T>(): Paginated<T> {
  return { items: [], page: 1, limit: 10, total: 0, pages: 0 };
}

export function toPaginated<T>(items: T[], page: number, limit: number, total?: number): Paginated<T> {
  return {
    items,
    page,
    limit,
    total: total ?? items.length,
    pages: Math.max(1, Math.ceil((total ?? items.length) / limit)),
  };
}

export function unwrap<T>(response: { data?: { data?: T } | T }): T | null {
  const d = response?.data as any;
  if (!d) return null;
  return (d?.data ?? d) as T;
}

export function isSuccessResponse<T>(res: any): res is { success: true; data: T } {
  return res?.success === true;
}
