/* Encabezado de página — BANCA NEN */
import { type ReactNode } from "react";
import { C, FONT } from "../../theme";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  icon?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions, icon }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {icon && (
          <span style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.gold + "1A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {icon}
          </span>
        )}
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.t1, letterSpacing: -0.4, margin: 0 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 11, color: C.t3, margin: "3px 0 0", maxWidth: 560 }}>{subtitle}</p>}
        </div>
      </div>
      {actions && <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}
