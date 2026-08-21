/* Badge — BANCA NEN */
import { type ReactNode } from "react";
import { badgeStyle, C } from "../../theme";

type Tone = "green" | "red" | "gold" | "blue" | "purple" | "gray";

const TONES: Record<Tone, { color: string; bg: string }> = {
  green: { color: C.green, bg: C.green + "1A" },
  red: { color: C.red, bg: C.red + "1A" },
  gold: { color: C.gold, bg: C.gold + "1A" },
  blue: { color: C.blue, bg: C.blue + "1A" },
  purple: { color: C.purple, bg: C.purple + "1A" },
  gray: { color: C.t2, bg: C.border + "66" },
};

export default function Badge({ tone = "gray", children, icon }: { tone?: Tone; children: ReactNode; icon?: ReactNode }) {
  const t = TONES[tone];
  return (
    <span style={{ ...badgeStyle(t.color, t.bg) }}>
      {icon}
      {children}
    </span>
  );
}
