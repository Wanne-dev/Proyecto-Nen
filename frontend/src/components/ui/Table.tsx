/* Tabla con soporte de ordenación — BANCA NEN */
import { type ReactNode, useState } from "react";
import { C, FONT } from "../../theme";
import Pagination from "../common/Pagination";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T, index: number) => ReactNode;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  width?: number | string;
  sortValue?: (row: T) => string | number;
}

interface Props<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string;
  pageSize?: number;
  emptyMessage?: string;
  paginated?: boolean;
  initialSort?: { key: string; dir: "asc" | "desc" };
}

export default function Table<T>({ columns, data, rowKey, pageSize = 10, emptyMessage = "Sin datos", paginated = true, initialSort }: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(initialSort?.key || null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSort?.dir || "asc");
  const [page, setPage] = useState(1);

  const sorted = (() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;
    const arr = [...data];
    arr.sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (typeof va === "number" && typeof vb === "number") return sortDir === "asc" ? va - vb : vb - va;
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return arr;
  })();

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = paginated ? sorted.slice((safePage - 1) * pageSize, safePage * pageSize) : sorted;

  const onSort = (col: Column<T>) => {
    if (!col.sortable || !col.sortValue) return;
    if (sortKey === col.key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(col.key);
      setSortDir("asc");
    }
    setPage(1);
  };

  return (
    <div style={{ fontFamily: FONT }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ backgroundColor: C.bg2 }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => onSort(col)}
                  style={{
                    padding: "8px 12px", textAlign: col.align || "left", color: C.t3,
                    fontWeight: 600, cursor: col.sortable ? "pointer" : "default",
                    whiteSpace: "nowrap", userSelect: "none",
                    ...(col.width ? { width: col.width } : {}),
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {col.header}
                    {sortKey === col.key && (
                      <span style={{ color: C.gold, fontSize: 9 }}>{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ padding: 32, textAlign: "center", color: C.t3, fontSize: 12 }}>
                  {emptyMessage}
                </td>
              </tr>
            )}
            {visible.map((row, i) => (
              <tr key={rowKey(row, i)} style={{ borderTop: "1px solid " + C.border, transition: "background-color .12s" }}>
                {columns.map((col) => (
                  <td key={col.key} style={{ padding: "8px 12px", textAlign: col.align || "left", color: C.t1 }}>
                    {col.render(row, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {paginated && totalPages > 1 && (
        <div style={{ padding: "10px 12px", borderTop: "1px solid " + C.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: C.t3 }}>
            {sorted.length} registros · Página {safePage} de {totalPages}
          </span>
          <Pagination page={safePage} totalPages={totalPages} onChange={setPage} compact />
        </div>
      )}
    </div>
  );
}
