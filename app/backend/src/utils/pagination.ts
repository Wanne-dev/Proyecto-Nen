/* Utilidades de paginación — BANCA NEN */

export interface PaginationQuery {
  page?: unknown;
  limit?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  offset: number;
}

export function parsePagination(
  query: PaginationQuery,
  defaultLimit = 20,
  maxLimit = 100
): PaginationMeta {
  const page = Math.max(1, parseInt(String(query.page ?? 1), 10) || 1);
  const rawLimit = parseInt(String(query.limit ?? defaultLimit), 10) || defaultLimit;
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));
  return { page, limit, offset: (page - 1) * limit };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function paginate<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  };
}
