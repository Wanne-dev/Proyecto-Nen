/* Botón — BANCA NEN */
import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { C, FONT } from "../../theme";

type Variant = "primary" | "success" | "danger" | "gold" | "ghost" | "outline";
type Size = "xs" | "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, React.CSSProperties> = {
  primary: { backgroundColor: C.blue, color: "#fff", border: "1px solid " + C.blue },
  success: { backgroundColor: C.green, color: "#0A0A0F", border: "1px solid " + C.green },
  danger: { backgroundColor: C.red, color: "#fff", border: "1px solid " + C.red },
  gold: { backgroundColor: C.gold, color: "#0A0A0F", border: "1px solid " + C.gold },
  ghost: { backgroundColor: "transparent", color: C.t2, border: "1px solid transparent" },
  outline: { backgroundColor: "transparent", color: C.t1, border: "1px solid " + C.border },
};

const SIZES: Record<Size, React.CSSProperties> = {
  xs: { padding: "3px 8px", fontSize: 10, borderRadius: 4 },
  sm: { padding: "5px 12px", fontSize: 11, borderRadius: 5 },
  md: { padding: "8px 16px", fontSize: 12, borderRadius: 6 },
  lg: { padding: "11px 22px", fontSize: 13, borderRadius: 8 },
};

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  fullWidth,
  children,
  style,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        fontWeight: 600,
        fontFamily: FONT,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "filter .15s, background-color .15s",
        ...VARIANTS[variant],
        ...SIZES[size],
        width: fullWidth ? "100%" : undefined,
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}
