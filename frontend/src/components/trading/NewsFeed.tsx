/* ============================================================
   NOTICIAS DE MERCADO — BANCA NEN
   Titulares curados (demo) con marca de tiempo relativa que
   avanza sola. Diseño ligero, sin cajas pesadas.
   ============================================================ */
import { useEffect, useState } from "react";
import { Newspaper } from "lucide-react";

interface NewsItem {
  id: number;
  tag: string;
  tagColor: string;
  headline: string;
  source: string;
  minutes: number;
  impact: "alta" | "media" | "baja";
}

const NEWS: NewsItem[] = [
  { id: 1, tag: "BTC", tagColor: "#f5a623", headline: "Bitcoin supera resistencia clave tras entrada de capital institucional", source: "CoinDesk", minutes: 6, impact: "alta" },
  { id: 2, tag: "MACRO", tagColor: "#0a84ff", headline: "La Fed mantiene tipos y el dólar cede terreno frente a las criptos", source: "Bloomberg", minutes: 18, impact: "alta" },
  { id: 3, tag: "ETH", tagColor: "#a78bfa", headline: "Ethereum registra récord de actividad en soluciones de capa 2", source: "The Block", minutes: 31, impact: "media" },
  { id: 4, tag: "IA", tagColor: "#22d3ee", headline: "Fondos de inversión aumentan exposición a activos digitales con IA", source: "Reuters", minutes: 47, impact: "media" },
  { id: 5, tag: "REG", tagColor: "#ff4d5e", headline: "Reguladores europeos publican nuevas guías para exchanges", source: "FT", minutes: 62, impact: "baja" },
  { id: 6, tag: "ORO", tagColor: "#f5a623", headline: "El oro toca máximos mientras los inversores buscan refugio", source: "CNBC", minutes: 75, impact: "media" },
];

const IMPACT_LABEL = { alta: "Alto impacto", media: "Medio", baja: "Bajo" };
const IMPACT_COLOR = { alta: "#ff4d5e", media: "#f5a623", baja: "#6b6b80" };

export default function NewsFeed() {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(iv);
  }, []);

  const ago = (m: number) => (m < 60 ? `hace ${m} min` : `hace ${Math.floor(m / 60)}h ${m % 60}m`);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 mb-1 px-1">
        <Newspaper size={13} className="text-[#00d4aa]" />
        <span className="text-[13px] font-semibold text-gray-300">Noticias del mercado</span>
        <span className="ml-auto text-[11px] text-gray-600 font-mono">feed en vivo</span>
      </div>
      {NEWS.map((n) => (
        <div key={n.id} className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-default">
          <span
            className="mt-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0"
            style={{ color: n.tagColor, backgroundColor: n.tagColor + "1a" }}
          >
            {n.tag}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-snug text-gray-200">{n.headline}</p>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-600">
              <span>{n.source}</span>
              <span>·</span>
              <span>{ago(n.minutes)}</span>
              <span
                className="ml-auto flex items-center gap-1"
                style={{ color: IMPACT_COLOR[n.impact] }}
              >
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: IMPACT_COLOR[n.impact] }} />
                {IMPACT_LABEL[n.impact]}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}