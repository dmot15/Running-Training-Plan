export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

/** Monday-start week. Returns the ISO date of the Monday on/before `iso`. */
export function mondayOfWeek(iso: string): string {
  const d = parseISODate(iso);
  const dow = d.getUTCDay(); // 0 = Sunday
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return toISODate(d);
}

export function diffDays(fromIso: string, toIso: string): number {
  const a = parseISODate(fromIso);
  const b = parseISODate(toIso);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function weeksBetween(fromIso: string, toIso: string): number {
  return Math.ceil((diffDays(fromIso, toIso) + 1) / 7);
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Monday = 0 ... Sunday = 6, matching the weekday order the source deck's sample weeks use. */
export function weekdayIndexMon0(iso: string): number {
  const dow = parseISODate(iso).getUTCDay(); // 0 = Sunday
  return dow === 0 ? 6 : dow - 1;
}
