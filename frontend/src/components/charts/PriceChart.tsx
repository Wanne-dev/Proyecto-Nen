/* ============================================================
   GRÁFICO DE PRECIOS PROFESIONAL — BANCA NEN (lightweight-charts v5)
   - NO recrea el chart en cada actualización (conserva el zoom/pan).
   - Actualiza la última vela con series.update() y anexa velas nuevas.
   - Indicadores superpuestos con encendido/apagado:
       · SMA 20/50, EMA 20 y Bandas de Bollinger → sobre el precio.
       · RSI (14) y MACD (12,26,9) → bandas inferiores integradas.
   - Volumen opcional (se oculta cuando hay osciladores activos).
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import {
  createChart, ColorType, CandlestickSeries, HistogramSeries, LineSeries,
  type IChartApi, type ISeriesApi, type Time,
} from "lightweight-charts";
import { C } from "../../theme";
import { sma, ema, bollinger, calculateRSI, calculateMACD } from "../../services/indicators";

export interface PricePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export type IndicatorKey = "sma" | "ema" | "boll" | "rsi" | "macd";

const META: Record<IndicatorKey, { label: string; color: string }> = {
  sma: { label: "SMA", color: "#f5a623" },
  ema: { label: "EMA", color: "#0a84ff" },
  boll: { label: "BOLL", color: "#a78bfa" },
  rsi: { label: "RSI", color: "#22d3ee" },
  macd: { label: "MACD", color: "#00d4aa" },
};

const ALL_KEYS: IndicatorKey[] = ["sma", "ema", "boll", "rsi", "macd"];

interface Props {
  data: PricePoint[];
  height?: number | "fill";
  showVolume?: boolean;
  colors?: { up: string; down: string };
  live?: boolean;
  defaultIndicators?: IndicatorKey[];
}

const toBar = (d: PricePoint) => ({
  time: d.time as Time, open: d.open, high: d.high, low: d.low, close: d.close,
});

const volOf = (d: PricePoint) =>
  (d.high - d.low) / Math.max(d.close, 1e-9) * 1e9;

/* Alinear valores a los tiempos de las velas (descarta NaN de calentamiento) */
function align(values: number[], times: number[]): { time: Time; value: number }[] {
  const out: { time: Time; value: number }[] = [];
  for (let i = 0; i < values.length && i < times.length; i++) {
    const v = values[i];
    if (!isFinite(v)) continue;
    out.push({ time: times[i] as Time, value: v });
  }
  return out;
}

const fmtVal = (n: number) =>
  n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 })
  : n >= 1 ? n.toFixed(2)
  : n.toFixed(4);

export default function PriceChart({
  data, height = 320, showVolume = true, colors, live = false, defaultIndicators,
}: Props) {
  const areaRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const lineRefs = useRef<Record<string, ISeriesApi<"Line">>>({});
  const prevRef = useRef<PricePoint[]>([]);
  const [enabled, setEnabled] = useState<Set<IndicatorKey>>(
    () => new Set(defaultIndicators || ["sma"])
  );
  const [, forceTick] = useState(0);

  const up = colors?.up || "#00d4aa";
  const down = colors?.down || "#ff4d5e";

  /* ------- Crear el chart UNA sola vez ------- */
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    let ch: IChartApi;
    try {
      ch = createChart(el, {
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: C.t3, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif",
        },
        grid: { vertLines: { color: "rgba(255,255,255,0.04)" }, horzLines: { color: "rgba(255,255,255,0.04)" } },
        crosshair: {
          mode: 1,
          vertLine: { color: "rgba(255,255,255,0.25)", width: 1, style: 2, labelBackgroundColor: "#1c1c2b" },
          horzLine: { color: "rgba(255,255,255,0.25)", width: 1, style: 2, labelBackgroundColor: "#1c1c2b" },
        },
        rightPriceScale: { borderColor: "rgba(255,255,255,0.06)", scaleMargins: { top: 0.05, bottom: 0.2 } },
        timeScale: { borderColor: "rgba(255,255,255,0.06)", timeVisible: true, secondsVisible: false, rightOffset: 4 },
        width: el.clientWidth, height: el.clientHeight,
      });
      chartRef.current = ch;
    } catch {
      return;
    }
    const onResize = () => {
      try { ch.applyOptions({ width: el.clientWidth, height: el.clientHeight }); } catch { /* ignore */ }
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    return () => {
      ro.disconnect();
      try { ch.remove(); } catch { /* ignore */ }
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      lineRefs.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------- Sincronizar datos (sin recrear el chart) ------- */
  useEffect(() => {
    const ch = chartRef.current;
    if (!ch || data.length === 0) return;
    try {
      if (!candleRef.current) {
        const cs = ch.addSeries(CandlestickSeries, {
          upColor: up, downColor: down,
          borderUpColor: up, borderDownColor: down,
          wickUpColor: up, wickDownColor: down,
        });
        candleRef.current = cs;
        cs.setData(data.map(toBar) as any);
        prevRef.current = data;
        ch.timeScale().fitContent();
      } else {
        const prev = prevRef.current;
        const samePrefix = prev.length > 0 &&
          data.length >= prev.length &&
          prev[prev.length - 1].time === data[prev.length - 1].time;
        if (samePrefix) {
          /* Actualiza la última vela y anexa las nuevas (conserva zoom) */
          for (let i = prev.length - 1; i < data.length; i++) {
            candleRef.current.update(toBar(data[i]) as any);
          }
        } else {
          candleRef.current.setData(data.map(toBar) as any);
          ch.timeScale().fitContent();
        }
        prevRef.current = data;
      }

      /* Volumen (solo si no hay osciladores activos) */
      const oscOn = enabled.has("rsi") || enabled.has("macd");
      if (showVolume && !oscOn) {
        if (!volumeRef.current) {
          const vs = ch.addSeries(HistogramSeries, {
            color: "rgba(120,140,255,0.35)", priceFormat: { type: "volume" }, priceScaleId: "vol",
          });
          volumeRef.current = vs;
          ch.priceScale("vol").applyOptions({ scaleMargins: { top: 0.9, bottom: 0 } });
        }
        const last = data[data.length - 1];
        volumeRef.current.update({ time: last.time as Time, value: volOf(last), color: last.close >= last.open ? up + "55" : down + "55" } as any);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  /* ------- Indicadores superpuestos ------- */
  useEffect(() => {
    const ch = chartRef.current;
    if (!ch || data.length === 0) return;
    try {
      const times = data.map((d) => d.time);
      const closes = data.map((d) => d.close);
      const oscOn = enabled.has("rsi") || enabled.has("macd");

      /* Escalas según osciladores activos */
      const rsiOn = enabled.has("rsi");
      const macdOn = enabled.has("macd");
      if (rsiOn && macdOn) {
        ch.priceScale("right").applyOptions({ scaleMargins: { top: 0.03, bottom: 0.58 } });
        ch.priceScale("rsi").applyOptions({ scaleMargins: { top: 0.56, bottom: 0.33 } });
        ch.priceScale("macd").applyOptions({ scaleMargins: { top: 0.31, bottom: 0.04 } });
      } else if (rsiOn) {
        ch.priceScale("right").applyOptions({ scaleMargins: { top: 0.03, bottom: 0.34 } });
        ch.priceScale("rsi").applyOptions({ scaleMargins: { top: 0.58, bottom: 0.04 } });
      } else if (macdOn) {
        ch.priceScale("right").applyOptions({ scaleMargins: { top: 0.03, bottom: 0.34 } });
        ch.priceScale("macd").applyOptions({ scaleMargins: { top: 0.58, bottom: 0.04 } });
      } else {
        ch.priceScale("right").applyOptions({ scaleMargins: { top: 0.05, bottom: 0.2 } });
      }

      /* Volumen: ocultar cuando hay osciladores */
      if (volumeRef.current && oscOn) {
        try { ch.removeSeries(volumeRef.current); } catch { /* ignore */ }
        volumeRef.current = null;
      } else if (!volumeRef.current && showVolume && !oscOn) {
        const vs = ch.addSeries(HistogramSeries, {
          color: "rgba(120,140,255,0.35)", priceFormat: { type: "volume" }, priceScaleId: "vol",
        });
        volumeRef.current = vs;
        ch.priceScale("vol").applyOptions({ scaleMargins: { top: 0.9, bottom: 0 } });
        vs.setData(data.map((d) => ({ time: d.time as Time, value: volOf(d), color: d.close >= d.open ? up + "55" : down + "55" })) as any);
      }

      /* Helper: crear/actualizar una línea */
      const upsertLine = (key: string, opts: Record<string, any>, pts: { time: Time; value: number }[]) => {
        let s = lineRefs.current[key];
        if (!s) {
          s = ch.addSeries(LineSeries, opts);
          lineRefs.current[key] = s;
        }
        s.setData(pts as any);
      };

      /* SMA 20/50 */
      if (enabled.has("sma")) {
        upsertLine("sma20", { color: "#f5a623", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, align(sma(closes, 20), times));
        upsertLine("sma50", { color: "#f97316", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, align(sma(closes, 50), times));
      }
      /* EMA 20 */
      if (enabled.has("ema")) {
        upsertLine("ema20", { color: "#0a84ff", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, align(ema(closes, 20), times));
      }
      /* Bollinger */
      if (enabled.has("boll")) {
        const bb = bollinger(closes, 20, 2);
        upsertLine("bbMid", { color: "#a78bfa", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, align(bb.mid, times));
        upsertLine("bbUp", { color: "rgba(167,139,250,0.6)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, align(bb.upper, times));
        upsertLine("bbLow", { color: "rgba(167,139,250,0.6)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, align(bb.lower, times));
      }
      /* RSI + bandas 30/70 */
      if (rsiOn) {
        const rv = calculateRSI(closes, 14);
        const off = closes.length - rv.length;
        const rTimes = times.slice(off);
        upsertLine("rsi", { color: "#22d3ee", lineWidth: 1, priceScaleId: "rsi", priceLineVisible: false, lastValueVisible: false }, align(rv, rTimes));
        upsertLine("rsi30", { color: "rgba(255,255,255,0.08)", lineWidth: 1, priceScaleId: "rsi", lineStyle: 2, priceLineVisible: false, lastValueVisible: false }, rTimes.map((t) => ({ time: t as Time, value: 30 })));
        upsertLine("rsi70", { color: "rgba(255,255,255,0.08)", lineWidth: 1, priceScaleId: "rsi", lineStyle: 2, priceLineVisible: false, lastValueVisible: false }, rTimes.map((t) => ({ time: t as Time, value: 70 })));
      }
      /* MACD */
      if (macdOn) {
        const r = calculateMACD(closes, 12, 26, 9);
        const off = closes.length - r.macd.length;
        const mTimes = times.slice(off);
        upsertLine("macd", { color: "#0a84ff", lineWidth: 1, priceScaleId: "macd", priceLineVisible: false, lastValueVisible: false }, align(r.macd, mTimes));
        upsertLine("macdSig", { color: "#f5a623", lineWidth: 1, priceScaleId: "macd", priceLineVisible: false, lastValueVisible: false }, align(r.signal, mTimes));
        upsertLine("macd0", { color: "rgba(255,255,255,0.08)", lineWidth: 1, priceScaleId: "macd", lineStyle: 2, priceLineVisible: false, lastValueVisible: false }, mTimes.map((t) => ({ time: t as Time, value: 0 })));
        let hist = lineRefs.current["macdHist"] as unknown as ISeriesApi<"Histogram"> | undefined;
        if (!hist) {
          hist = ch.addSeries(HistogramSeries, { priceScaleId: "macd", priceLineVisible: false, lastValueVisible: false });
          lineRefs.current["macdHist"] = hist as any;
        }
        hist.setData(r.histogram.map((v, i) => ({ time: mTimes[i] as Time, value: v, color: v >= 0 ? "rgba(0,212,170,0.5)" : "rgba(255,77,94,0.5)" })) as any);
      }

      /* Quitar series de indicadores desactivados */
      const wanted = new Set<string>();
      if (enabled.has("sma")) ["sma20", "sma50"].forEach((k) => wanted.add(k));
      if (enabled.has("ema")) wanted.add("ema20");
      if (enabled.has("boll")) ["bbMid", "bbUp", "bbLow"].forEach((k) => wanted.add(k));
      if (rsiOn) ["rsi", "rsi30", "rsi70"].forEach((k) => wanted.add(k));
      if (macdOn) ["macd", "macdSig", "macd0", "macdHist"].forEach((k) => wanted.add(k));
      Object.keys(lineRefs.current).forEach((k) => {
        if (!wanted.has(k)) {
          try { ch.removeSeries(lineRefs.current[k]); } catch { /* ignore */ }
          delete lineRefs.current[k];
        }
      });

      forceTick((n) => n + 1);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, enabled, showVolume, up, down]);

  /* ------- Leyenda con valores actuales ------- */
  const legend: { key: IndicatorKey; label: string; value: string }[] = [];
  if (data.length > 0) {
    const closes = data.map((d) => d.close);
    if (enabled.has("sma")) {
      const s20 = sma(closes, 20); const v = s20[s20.length - 1];
      if (isFinite(v)) legend.push({ key: "sma", label: "SMA20", value: fmtVal(v) });
    }
    if (enabled.has("ema")) {
      const e = ema(closes, 20); const v = e[e.length - 1];
      if (isFinite(v)) legend.push({ key: "ema", label: "EMA20", value: fmtVal(v) });
    }
    if (enabled.has("rsi")) {
      const r = calculateRSI(closes, 14); const v = r[r.length - 1];
      if (isFinite(v)) legend.push({ key: "rsi", label: "RSI", value: v.toFixed(0) });
    }
    if (enabled.has("macd")) {
      const m = calculateMACD(closes, 12, 26, 9); const v = m.macd[m.macd.length - 1];
      if (isFinite(v)) legend.push({ key: "macd", label: "MACD", value: fmtVal(v) });
    }
  }

  const toggle = (k: IndicatorKey) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const chartH = height === "fill" ? "100%" : height;

  return (
    <div className="relative flex flex-col w-full" style={{ height: chartH, minHeight: height === "fill" ? 260 : undefined }}>
      {/* Barra de indicadores */}
      <div className="flex items-center gap-1.5 px-2 pb-1.5 flex-wrap shrink-0">
        {ALL_KEYS.map((k) => {
          const on = enabled.has(k);
          return (
            <button
              key={k}
              onClick={() => toggle(k)}
              className={`text-[12px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
                on
                  ? "border-transparent text-black"
                  : "border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20"
              }`}
              style={{ backgroundColor: on ? META[k].color : "transparent" }}
            >
              {META[k].label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {legend.map((l) => (
            <span key={l.label} className="text-[12px] font-mono text-gray-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: META[l.key].color }} />
              {l.label} <span className="text-gray-200">{l.value}</span>
            </span>
          ))}
          {live && (
            <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              EN VIVO
            </span>
          )}
        </div>
      </div>

      {/* Lienzo del gráfico */}
      <div ref={areaRef} className="flex-1 w-full" style={{ minHeight: 0 }} />
    </div>
  );
}