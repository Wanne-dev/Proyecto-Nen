/* Toggle switch — BANCA NEN */
import { C } from "../../theme";

export default function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 999,
        backgroundColor: checked ? C.green : C.border,
        position: "relative", border: "none", cursor: disabled ? "not-allowed" : "pointer",
        transition: "background-color .2s", opacity: disabled ? 0.5 : 1,
        padding: 0, flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute", top: 3, left: checked ? 21 : 3, width: 16, height: 16,
          borderRadius: "50%", backgroundColor: "#fff", transition: "left .2s",
        }}
      />
    </button>
  );
}
