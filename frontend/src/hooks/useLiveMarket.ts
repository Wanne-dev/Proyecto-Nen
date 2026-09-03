/* ============================================================
   MOTOR DE MERCADO EN VIVO — BANCA NEN
   Sobre las velas reales del backend (CoinGecko) genera un flujo
   continuo de ticks: random-walk con momentum, reversión a la media
   y ráfagas de volatilidad (movimiento "exagerado pero creíble").
   NO recarga la API: solo evoluciona localmente cada ~1.5s.
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import type { OHLCPoint } from "../services/coingecko";

interface Options {
  intervalMs?: number;   // frecuencia de tick
  volatility?: number;   // % de movimiento base por tick
  burstChance?: number;  // probabilidad de ráfaga (movimiento grande)
  maxBars?: number;      // máximo de velas en memoria
}

export function useLiveMarket(base: OHLCPoint[], resetKey: string, opts: Options = {}) {
  const {
    intervalMs = 1500,
    volatility = 0.0018,
    burstChance = 0.12,
    maxBars = 300,
  } = opts;

  const [points, setPoints] = useState<OHLCPoint[]>(() => base.slice());
  const keyRef = useRef(resetKey);
  const anchorRef = useRef(0);
  const trendRef = useRef(0);

  /* Reset cuando cambia el activo/timeframe o llegan datos nuevos */
  useEffect(() => {
    if (keyRef.current !== resetKey) {
      keyRef.current = resetKey;
      if (base.length > 0) {
        setPoints(base.map((p) => ({ ...p })));
        anchorRef.current = base[base.length - 1].close;
        trendRef.current = 0;
      }
    }
  }, [resetKey, base]);

  /* Bucle de ticks en vivo */
  useEffect(() => {
    anchorRef.current = base.length > 0 ? base[base.length - 1].close : anchorRef.current;
    const iv = setInterval(() => {
      setPoints((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];

        const shock = (Math.random() - 0.5) * 2; // -1 .. 1
        const burst = Math.random() < burstChance
          ? (Math.random() < 0.5 ? -1 : 1) * volatility * (2 + Math.random() * 5)
          : 0;
        let change = shock * volatility + trendRef.current * 0.35 + burst;

        /* Reversión a la media (evita que el precio se dispare al infinito) */
        if (anchorRef.current > 0) {
          const dev = (last.close - anchorRef.current) / anchorRef.current;
          change -= dev * 0.02;
        }

        const close = Math.max(last.close * 0.85, last.close * (1 + change));
        trendRef.current = trendRef.current * 0.7 + change * 0.3;
        anchorRef.current = anchorRef.current * (1 + change * 0.12);

        const high = Math.max(last.high, close) * (1 + Math.random() * volatility * 0.4);
        const low = Math.min(last.low, close) * (1 - Math.random() * volatility * 0.4);

        /* De vez en cuando "cierra" la vela y abre una nueva (el chart avanza) */
        const isNewBar = Math.random() < 0.09;
        if (isNewBar) {
          const nb: OHLCPoint = { time: last.time + 60, open: last.close, high, low, close };
          const next = [...prev, nb];
          return next.length > maxBars ? next.slice(next.length - maxBars) : next;
        }
        const updated: OHLCPoint = { ...last, close, high, low };
        return [...prev.slice(0, -1), updated];
      });
    }, intervalMs);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, resetKey]);

  const livePrice = points.length > 0 ? points[points.length - 1].close : null;
  return { points, livePrice };
}