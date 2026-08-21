/* Paginación — BANCA NEN */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { C, FONT } from "../../theme";

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  compact?: boolean;
}

export default function Pagination({ page, totalPages, onChange, compact }: Props) {
  const pages: number[] = [];
  const max = compact ? 5 : 7;
  let start = Math.max(1, page - Math.floor(max / 2));
  let end = Math.min(totalPages, start + max - 1);
  start = Math.max(1, end - max + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  const btn: React.CSSProperties = {
    minWidth: compact ? 24 : 30, height: compact ? 24 : 30, borderRadius: 5,
    border: "1px solid " + C.border, backgroundColor: C.card, color: C.t2,
    fontSize: compact ? 9 : 11, cursor: "pointer", fontFamily: FONT, display: "inline-flex",
    alignItems: "center", justifyContent: "center", padding: "0 6px",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: FONT }}>
      <button style={btn} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Anterior">
        <ChevronLeft size={compact ? 11 : 13} />
      </button>
      {start > 1 && (
        <>
          <button style={btn} onClick={() => onChange(1)}>1</button>
          {start > 2 && <span style={{ color: C.t3, fontSize: 10 }}>…</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          style={{
            ...btn,
            backgroundColor: p === page ? C.gold : C.card,
            color: p === page ? "#0A0A0F" : C.t2,
            fontWeight: p === page ? 700 : 400,
          }}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span style={{ color: C.t3, fontSize: 10 }}>…</span>}
          <button style={btn} onClick={() => onChange(totalPages)}>{totalPages}</button>
        </>
      )}
      <button style={btn} disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Siguiente">
        <ChevronRight size={compact ? 11 : 13} />
      </button>
    </div>
  );
}
