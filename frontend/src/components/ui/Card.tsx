/* Tarjeta — BANCA NEN */
import { type HTMLAttributes, type ReactNode } from "react";
import { C } from "../../theme";

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  children: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  padded?: boolean;
  hover?: boolean;
}

export default function Card({ children, title, subtitle, action, padded = true, hover, style, ...rest }: Props) {
  return (
    <div
      {...rest}
      style={{
        backgroundColor: C.card,
        border: "1px solid " + C.border,
        borderRadius: 12,
        overflow: "hidden",
        transition: "border-color .15s, transform .15s",
        ...(hover ? { cursor: "pointer" } : {}),
        ...style,
      }}
    >
      {(title || action) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid " + C.border,
            gap: 8,
          }}
        >
          <div>
            {title && <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: padded ? 16 : 0 }}>{children}</div>
    </div>
  );
}
