/* Spinner — BANCA NEN */
import { C } from "../../theme";

export default function Spinner({ size = 22, color = C.gold, label }: { size?: number; color?: string; label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 20 }}>
      <div
        style={{
          width: size, height: size, borderRadius: "50%",
          border: "2px solid " + color + "30", borderTopColor: color,
          animation: "spin 0.8s linear infinite",
        }}
      />
      {label && <span style={{ fontSize: 11, color: C.t2 }}>{label}</span>}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
