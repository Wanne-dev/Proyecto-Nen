/* Modal reutilizable — BANCA NEN */
import { type ReactNode, useEffect } from "react";
import { C, FONT } from "../../theme";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export default function Modal({ open, onClose, title, subtitle, children, footer, width = 420 }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)",
        zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        fontFamily: FONT,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: C.bg2, borderRadius: 12, border: "1px solid " + C.border,
          width, maxWidth: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,.5)",
        }}
      >
        {(title || subtitle) && (
          <div style={{ padding: "14px 18px", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              {title && <div style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{title}</div>}
              {subtitle && <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{subtitle}</div>}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              style={{ background: "none", border: "none", cursor: "pointer", color: C.t3, fontSize: 20, fontFamily: FONT, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        )}
        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: "12px 18px", borderTop: "1px solid " + C.border, display: "flex", justifyContent: "flex-end", gap: 8 }}>{footer}</div>}
      </div>
    </div>
  );
}
