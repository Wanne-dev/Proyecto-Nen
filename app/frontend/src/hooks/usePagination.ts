/* Hook: paginación — BANCA NEN */
import { useEffect, useMemo, useState } from "react";

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const [inputPage, setInputPage] = useState("1");

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  useEffect(() => {
    setInputPage(String(page));
  }, [page]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const goToPage = (p: number) => {
    const clamped = Math.min(Math.max(1, p), totalPages);
    setPage(clamped);
  };

  const applyInput = () => {
    const n = parseInt(inputPage, 10);
    if (!isNaN(n)) goToPage(n);
    else setInputPage(String(page));
  };

  return { page, totalPages, pageItems, pageSize, goToPage, inputPage, setInputPage, applyInput };
}
