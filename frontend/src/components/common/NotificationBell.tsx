/* Campana de notificaciones — BANCA NEN */
import { useState } from "react";
import { Bell, CheckCheck, ShieldAlert, ShieldCheck, RefreshCw, TrendingUp, Wallet, Info, XCircle } from "lucide-react";
import { useNotificationStore } from "../../store/notification.slice";
import { C, FONT, timeAgo } from "../../theme";

const TYPE_META: Record<string, { icon: any; color: string }> = {
  security: { icon: ShieldAlert, color: C.red },
  transaction: { icon: Wallet, color: C.green },
  trading: { icon: TrendingUp, color: C.blue },
  market: { icon: TrendingUp, color: C.blue },
  system: { icon: Info, color: C.purple },
  promotion: { icon: Info, color: C.gold },
  promo: { icon: Info, color: C.gold },
  kyc: { icon: ShieldCheck, color: C.blue },
};

export default function NotificationBell() {
  const { notifications, unread, markRead, markAllRead } = useNotificationStore();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative", fontFamily: FONT }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notificaciones"
        style={{ position: "relative", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}
      >
        <Bell size={17} color={open ? C.gold : C.t2} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute", top: -2, right: -2, minWidth: 15, height: 15, borderRadius: 999,
              backgroundColor: C.red, color: "#fff", fontSize: 9, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 998 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: "absolute", right: 0, top: 36, width: 340, maxWidth: "90vw", zIndex: 999,
              backgroundColor: C.bg2, border: "1px solid " + C.border, borderRadius: 12,
              boxShadow: "0 16px 50px rgba(0,0,0,.55)", overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid " + C.border }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Notificaciones</span>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.gold, fontSize: 10, display: "flex", alignItems: "center", gap: 4, fontFamily: FONT }}
                >
                  <CheckCheck size={12} /> Marcar todas
                </button>
              )}
            </div>
            <div style={{ maxHeight: 380, overflowY: "auto" }}>
              {notifications.length === 0 && (
                <div style={{ padding: 24, textAlign: "center", color: C.t3, fontSize: 11 }}>Sin notificaciones</div>
              )}
              {notifications.map((n) => {
                const meta = TYPE_META[n.type] || TYPE_META.system;
                const Icon = meta.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    style={{
                      display: "flex", gap: 10, padding: "10px 14px", width: "100%", textAlign: "left",
                      backgroundColor: n.read ? "transparent" : C.card + "80", border: "none",
                      borderBottom: "1px solid " + C.border, cursor: "pointer", fontFamily: FONT,
                    }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: meta.color + "1A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={13} color={meta.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.t1, display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title}</span>
                        {!n.read && <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: C.gold, flexShrink: 0, marginTop: 4 }} />}
                      </div>
                      <div style={{ fontSize: 10, color: C.t2, marginTop: 2, lineHeight: 1.4 }}>{n.message}</div>
                      <div style={{ fontSize: 9, color: C.t3, marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
