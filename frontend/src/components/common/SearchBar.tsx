/* Barra de búsqueda — BANCA NEN */
import { Search, X } from "lucide-react";
import { C, FONT } from "../../theme";

export default function SearchBar({ value, onChange, placeholder = "Buscar...", width }: { value: string; onChange: (v: string) => void; placeholder?: string; width?: number | string }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 7,
        padding: "6px 10px", borderRadius: 6, backgroundColor: C.card,
        border: "1px solid " + C.border, width: width || 220, fontFamily: FONT,
      }}
    >
      <Search size={13} color={C.t3} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ background: "none", border: "none", outline: "none", color: C.t1, fontSize: 11, width: "100%", fontFamily: FONT }}
      />
      {value && (
        <button onClick={() => onChange("")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }} aria-label="Limpiar">
          <X size={12} color={C.t3} />
        </button>
      )}
    </div>
  );
}
