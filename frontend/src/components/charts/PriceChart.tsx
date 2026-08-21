/* Gráfico de precios (lightweight-charts) — BANCA NEN
   Se adapta al tamaño de su contenedor (fill) o acepta alto fijo. */
import { useEffect, useRef, useState } from "react";
import {
  createChart, ColorType, CandlestickSeries, HistogramSeries, type IChartApi,
} from "lightweight-charts";
import { C } from "../../theme";

export interface PricePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Props {
  data: PricePoint[];
  height?: number | "fill";
  showVolume?: boolean;
  colors?: { up: string; down: string };
}

export default function PriceChart({ data, height = 320, showVolume = true, colors }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [measuredH, setMeasuredH] = useState<number | null>(null);

  /* Medir el contenedor cuando height="fill" */
  useEffect(() => {
    if (height !== "fill") return;
    const el = elRef.current;
    if (!el) return;
    const measure = () => setMeasuredH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  const chartHeight = height === "fill" ? Math.max(200, measuredH || 300) : height;

  useEffect(() => {
    const el = elRef.current;
    if (!el || data.length === 0) return;
    try { chartRef.current?.remove(); } catch { /* disposed */ }

    const up = colors?.up || C.green;
    const down = colors?.down || C.red;

    const ch = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: C.bg },
        textColor: C.t3,
        fontSize: 10,
        fontFamily: "Inter, sans-serif",
      },
      grid: { vertLines: { color: "#1A1A2E" }, horzLines: { color: "#1A1A2E" } },
      crosshair: {
        vertLine: { color: C.gold, width: 1, style: 2 },
        horzLine: { color: C.gold, width: 1, style: 2 },
      },
      rightPriceScale: { borderColor: C.border, scaleMargins: showVolume ? { top: 0.1, bottom: 0.25 } : { top: 0.1, bottom: 0.1 } },
      timeScale: { borderColor: C.border, timeVisible: true, secondsVisible: false },
      width: el.clientWidth,
      height: el.clientHeight || chartHeight,
    });

    const cs = ch.addSeries(CandlestickSeries, {
      upColor: up, downColor: down, borderUpColor: up, borderDownColor: down,
      wickUpColor: up, wickDownColor: down,
    });
    cs.setData(data.map((d) => ({ time: d.time as any, open: d.open, high: d.high, low: d.low, close: d.close })) as any);

    if (showVolume) {
      const vs = ch.addSeries(HistogramSeries, {
        color: C.blue + "40",
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
      });
      ch.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      vs.setData(
        data.map((d, i) => ({
          time: d.time as any,
          value: (d.high - d.low) * 1e6 + (i > 0 ? Math.abs(d.close - data[i - 1].close) * 5e6 : 0),
          color: d.close >= d.open ? up + "30" : down + "30",
        })) as any
      );
    }

    chartRef.current = ch;

    const onResize = () => {
      try { ch.applyOptions({ width: el.clientWidth, height: el.clientHeight || chartHeight }); } catch { /* ignore */ }
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      try { ch.remove(); } catch { /* ignore */ }
      chartRef.current = null;
    };
  }, [data, chartHeight, showVolume, colors?.up, colors?.down]);

  return <div ref={elRef} style={{ width: "100%", height: height === "fill" ? "100%" : chartHeight }} />;
}
