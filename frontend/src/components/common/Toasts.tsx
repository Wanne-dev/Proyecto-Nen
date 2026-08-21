/* Toasts globales — BANCA NEN */
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { useUIStore } from "../../store/ui.slice";
import { C, FONT } from "../../theme";

const META = {
  success: { color: C.green, Icon: CheckCircle2 },
  error: { color: C.red, Icon: XCircle },
  info: { color: C.blue, Icon: Info },
  warning: { color: C.gold, Icon: AlertTriangle },
};

export default function Toasts() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);

  return (
    <div style={{ position: "fixed", bottom: 18, right: 18, zIndex: 20000, display: "flex", flexDirection: "column", gap: 8, maxWidth: 340, fontFamily: FONT }}>
      {toasts.map((t) => {
        const m = META[t.type];
        const Icon = m.Icon;
        return (
          <div
            key={t.id}
            style={{
              backgroundColor: C.bg2, border: "1px solid " + m.color + "55", borderRadius: 10,
              padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start",
              boxShadow: "0 10px 30px rgba(0,0,0,.5)", animation: "toastIn .25s ease-out",
            }}
          >
            <Icon size={16} color={m.color} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{t.title}</div>
              {t.message && <div style={{ fontSize: 10, color: C.t2, marginTop: 2 }}>{t.message}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.t3, padding: 0, display: "flex" }} aria-label="Cerrar">
              <X size={13} />
            </button>
          </div>
        );
      })}
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
