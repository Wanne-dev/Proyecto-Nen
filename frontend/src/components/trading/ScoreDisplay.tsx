/* Score de acierto IA (0-100) — BANCA NEN */
import { Sparkles } from "lucide-react";
import { C, FONT } from "../../theme";

interface Props {
  score: number;          // 0-100
  confidence?: number;    // 0-1
  size?: "sm" | "md" | "lg";
  showRing?: boolean;
}

export default function ScoreDisplay({ score, confidence, size = "md", showRing = true }: Props) {
  const color = score >= 65 ? C.green : score >= 45 ? C.gold : C.red;
  const label = score >= 65 ? "ALTA" : score >= 45 ? "MEDIA" : "BAJA";
  const dims = size === "lg" ? 84 : size === "md" ? 60 : 40;

  const ring = (
    <svg width={dims} height={dims} viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="15.5" fill="none" stroke={C.border} strokeWidth="3" />
      <circle
        cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={`${(score / 100) * 97.4} 97.4`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
        style={{ transition: "stroke-dasharray .6s ease" }}
      />
    </svg>
  );

  const inner = (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: size === "lg" ? 17 : size === "md" ? 14 : 11, fontWeight: 800, color: C.t1, lineHeight: 1 }}>{score}</span>
      <span style={{ fontSize: 6, color: color, fontWeight: 700, letterSpacing: 0.5 }}>{label}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: FONT }}>
      {showRing && (
        <div style={{ position: "relative", width: dims, height: dims }}>
          {ring}
          {inner}
        </div>
      )}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: C.t1 }}>
          <Sparkles size={12} color={color} />
          Score IA de acierto
        </div>
        <div style={{ fontSize: 9, color: C.t3, marginTop: 2 }}>
          {confidence ? `Confianza del ${Math.round(confidence * 100)}% · ` : ""}
          Ensamble LSTM + RF + XGB
        </div>
      </div>
    </div>
  );
}
