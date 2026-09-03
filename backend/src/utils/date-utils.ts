/* Utilidades de fechas — BANCA NEN */

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60_000);
}
