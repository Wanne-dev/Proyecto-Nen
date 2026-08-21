/* Input — BANCA NEN */
import { type InputHTMLAttributes, type ReactNode, useId } from "react";
import { C, FONT } from "../../theme";

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix" | "size"> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export default function Input({ label, hint, error, prefix, suffix, style, id, ...rest }: Props) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: 10, color: C.t3, fontWeight: 600 }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {prefix && <span style={{ position: "absolute", left: 10, color: C.t3, fontSize: 12 }}>{prefix}</span>}
        <input
          {...rest}
          id={inputId}
          style={{
            width: "100%",
            padding: "8px 10px",
            paddingLeft: prefix ? 26 : 10,
            paddingRight: suffix ? 26 : 10,
            fontSize: 12,
            borderRadius: 6,
            backgroundColor: C.card,
            border: "1px solid " + (error ? C.red : C.border),
            color: C.t1,
            outline: "none",
            fontFamily: FONT,
            transition: "border-color .15s",
            ...style,
          }}
        />
        {suffix && <span style={{ position: "absolute", right: 10, color: C.t3, fontSize: 12 }}>{suffix}</span>}
      </div>
      {error ? (
        <span style={{ fontSize: 9, color: C.red }}>{error}</span>
      ) : hint ? (
        <span style={{ fontSize: 9, color: C.t3 }}>{hint}</span>
      ) : null}
    </div>
  );
}
