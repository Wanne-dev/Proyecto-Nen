/* Gráfico de referencia vs. estimación por reglas — BANCA NEN */
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { C, FONT } from "../../theme";

interface Props {
  data: Array<{ name: string; actual: number; predicted: number }>;
  height?: number;
}

export default function PredictionChart({ data, height = 220 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }} barGap={3}>
        <XAxis
          dataKey="name"
          tick={{ fill: C.t3, fontSize: 11, fontFamily: FONT }}
          axisLine={{ stroke: C.border }}
          tickLine={false}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={54}
        />
        <YAxis
          tick={{ fill: C.t3, fontSize: 11, fontFamily: FONT }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v: number) => "$" + v.toLocaleString(undefined, { notation: "compact", maximumFractionDigits: 1 })}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: C.bg2, border: "1px solid " + C.border, borderRadius: 8,
            fontFamily: FONT, fontSize: 13, color: C.t1,
          }}
          labelStyle={{ color: C.t3, fontSize: 12 }}
          formatter={(value, name) => [
            "$" + Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }),
            name === "actual" ? "Precio actual" : "Estimación",
          ]}
        />
        <Bar dataKey="actual" radius={[3, 3, 0, 0]} maxBarSize={26}>
          {data.map((_, i) => (
            <Cell key={i} fill={C.blue + "99"} />
          ))}
        </Bar>
        <Bar dataKey="predicted" radius={[3, 3, 0, 0]} maxBarSize={26}>
          {data.map((_, i) => (
            <Cell key={i} fill={C.gold + "CC"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
