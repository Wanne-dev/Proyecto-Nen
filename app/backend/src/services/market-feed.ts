import { offlineMarketEnabled } from "../config/operations";

export type MarketSnapshot<T> =
  | { status: "fresh" | "stale"; source: string; asOf: string; data: T }
  | { status: "offline" | "unavailable"; source: string; asOf: null; data: null };

type Observation<T> = { at: number; data: T };
type Entry<T> = { observation?: Observation<T>; checkAfter: number; pending?: Promise<void>; failed?: boolean };

/** Caché acotada por las claves que usa cada feed. Un fallo nunca prolonga la vida del dato anterior. */
export function marketFeed<K, T>(
  source: string, refreshMs: number, freshMs: number, maxAgeMs: number,
  load: (key: K) => Promise<Observation<T> | null>,
) {
  const cache = new Map<K, Entry<T>>();
  return async (key: K): Promise<MarketSnapshot<T>> => {
    if (offlineMarketEnabled()) return { status: "offline", source, asOf: null, data: null };
    let entry = cache.get(key);
    if (!entry) { entry = { checkAfter: 0 }; cache.set(key, entry); }
    const slot = entry;
    if (!slot.pending && Date.now() >= slot.checkAfter) {
      slot.pending = (async () => {
        const next = await load(key).catch(() => null);
        const now = Date.now();
        if (next && Number.isFinite(next.at) && next.at <= now && now - next.at <= maxAgeMs) {
          // Un intermediario puede devolver una copia más vieja que la última observación.
          if (!slot.observation || next.at >= slot.observation.at) slot.observation = next;
          slot.failed = false;
          slot.checkAfter = now + refreshMs;
        } else {
          slot.failed = true;
          slot.checkAfter = now + Math.min(refreshMs, 15_000);
        }
      })().finally(() => { slot.pending = undefined; });
    }
    if (slot.pending) await slot.pending;
    const observed = slot.observation;
    if (!observed || Date.now() - observed.at > maxAgeMs) {
      slot.observation = undefined;
      return { status: "unavailable", source, asOf: null, data: null };
    }
    return { status: !slot.failed && Date.now() - observed.at <= freshMs ? "fresh" : "stale", source,
      asOf: new Date(observed.at).toISOString(), data: observed.data };
  };
}

export function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function marketNumber(value: unknown): number | null {
  if (typeof value !== "number" && !(typeof value === "string" && value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export async function publicJson(url: string): Promise<Observation<unknown> | null> {
  const response = await fetch(url, {
    redirect: "error", signal: AbortSignal.timeout(5000),
    headers: { Accept: "application/json", "Cache-Control": "no-cache", "User-Agent": "BANCA-NEN/1.0" },
  });
  if (!response.ok) return null;
  const receivedAt = Date.now();
  const date = Date.parse(response.headers.get("date") ?? "");
  const age = marketNumber(response.headers.get("age"));
  // El ticker no lleva hora de la última transacción; datamos la observación HTTP, no la transacción.
  const at = Math.min(Number.isFinite(date) ? date : receivedAt, receivedAt - 1000 * Math.max(0, age ?? 0));
  return { at, data: await response.json() as unknown };
}
