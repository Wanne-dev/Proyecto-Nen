/* Gráfico de rendimiento (área/línea) — BANCA NEN */
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { C, FONT } from "../../theme";

interface Point {
  date: string;
  [key: string]: any;
}

interface Props {
  data: Point[];
  dataKey?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  gradientId?: string;
  formatValue?: (v: number) => string;
}

export default function PerformanceChart({
  data, dataKey = "value", color = C.green, height = 260,
  showGrid = true, gradientId = "perfGrad", formatValue,
}: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showGrid && <CartesianGrid stroke={C.border + "55"} strokeDasharray="3 3" vertical={false} />}
        <XAxis
          dataKey="date"
          tick={{ fill: C.t3, fontSize: 9, fontFamily: FONT }}
          axisLine={{ stroke: C.border }}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          tick={{ fill: C.t3, fontSize: 9, fontFamily: FONT }}
          axisLine={false}
          tickLine={false}
          width={54}
          tickFormatter={(v: number) => (formatValue ? formatValue(v) : "$" + v.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 1 }))}
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: C.bg2, border: "1px solid " + C.border, borderRadius: 8,
            fontFamily: FONT, fontSize: 11, color: C.t1,
          }}
          labelStyle={{ color: C.t3, fontSize: 10 }}
          formatter={(value: any) => [(formatValue ? formatValue(value) : "$" + Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })), ""]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 3, fill: color, stroke: C.bg }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
