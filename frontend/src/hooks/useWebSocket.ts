/* ============================================================
   Hook: WebSocket — BANCA NEN
   Conecta con el socket del backend (socket.io) en el mismo
   origen. Si el backend no expone socket, simplemente reporta
   desconexión (sin datos simulados).
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export interface LiveTick {
  symbol: string;
  price: number;
  change24h: number;
  ts: number;
}

export function useWebSocket(enabled = true) {
  const [connected, setConnected] = useState(false);
  const [ticks, setTicks] = useState<Record<string, LiveTick>>({});
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    try {
      const socket = io({ transports: ["websocket"], reconnectionAttempts: 3, timeout: 3000 });
      socketRef.current = socket;
      socket.on("connect", () => { if (!cancelled) setConnected(true); });
      socket.on("disconnect", () => { if (!cancelled) setConnected(false); });
      socket.on("tick", (tick: LiveTick) => {
        if (!cancelled) setTicks((prev) => ({ ...prev, [tick.symbol]: tick }));
      });
      socket.on("connect_error", () => { if (!cancelled) setConnected(false); });
    } catch {
      if (!cancelled) setConnected(false);
    }

    return () => {
      cancelled = true;
      try { socketRef.current?.disconnect(); } catch { /* ignore */ }
    };
  }, [enabled]);

  return { connected, ticks, socket: socketRef.current };
}
