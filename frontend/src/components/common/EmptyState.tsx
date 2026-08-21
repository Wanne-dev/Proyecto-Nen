/* Estado vacío — BANCA NEN */
import { type ReactNode } from "react";
import { Inbox } from "lucide-react";
import { C, FONT } from "../../theme";

export default function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message?: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", gap: 8, textAlign: "center", fontFamily: FONT }}>
      <span style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: C.border + "55", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon || <Inbox size={22} color={C.t3} />}
      </span>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.t1 }}>{title}</div>
      {message && <div style={{ fontSize: 11, color: C.t3, maxWidth: 360 }}>{message}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
