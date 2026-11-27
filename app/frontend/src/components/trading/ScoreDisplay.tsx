import { C } from "../../theme";

export function scoreColor(score: number) {
  return score >= 65 ? C.green : score >= 45 ? C.gold : C.red;
}

export default function ScoreDisplay({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-16 place-items-center">
        <svg className="absolute inset-0" width="64" height="64" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={C.border} strokeWidth="3" />
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3" pathLength="100"
            strokeDasharray={`${score} 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
        </svg>
        <strong style={{ color }}>{score}<span className="sr-only"> de 100</span></strong>
      </div>
      <div>
        <p className="text-sm font-semibold">Puntaje por reglas</p>
        <p className="text-xs" style={{ color: C.t3 }}>No mide probabilidad de acierto</p>
      </div>
    </div>
  );
}
