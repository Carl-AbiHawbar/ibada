// All admin reporting uses the shop's local time, Asia/Beirut (DST-aware via Intl).
const TZ = 'Asia/Beirut';

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function beirutParts(d: Date) {
  const p = Object.fromEntries(partsFormatter.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year!, m: +p.month!, d: +p.day!, h: +p.hour!, min: +p.minute!, s: +p.second! };
}

/** Minutes Beirut is ahead of UTC at instant `d`. */
function offsetMinutes(d: Date): number {
  const p = beirutParts(d);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
  return Math.round((asUtc - Math.floor(d.getTime() / 1000) * 1000) / 60000);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Beirut calendar date of an instant, as `YYYY-MM-DD`. */
export function beirutDateKey(d: Date): string {
  const p = beirutParts(d);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/** First instant of a Beirut calendar day. */
export function beirutDayStart(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
  const utcMidnight = Date.UTC(y, m - 1, d);
  let guess = utcMidnight - offsetMinutes(new Date(utcMidnight)) * 60000;
  const second = offsetMinutes(new Date(guess));
  guess = utcMidnight - second * 60000;
  return new Date(guess);
}

/** Add whole days to a `YYYY-MM-DD` key. */
export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export type DateRange = { from: Date; to: Date };

/** `today`, or the last 7 / 30 Beirut days including today; `to` is exclusive. */
export function rangeForPreset(preset: 'today' | '7d' | '30d', now: Date): DateRange {
  const days = preset === 'today' ? 1 : preset === '7d' ? 7 : 30;
  const today = beirutDateKey(now);
  return { from: beirutDayStart(addDays(today, -(days - 1))), to: beirutDayStart(addDays(today, 1)) };
}

/** `2026-09-27 00:30` or `2026-09-27`, in Beirut time. */
export function formatBeirut(d: Date, style: 'datetime' | 'date'): string {
  const p = beirutParts(d);
  const date = `${p.y}-${pad(p.m)}-${pad(p.d)}`;
  return style === 'date' ? date : `${date} ${pad(p.h)}:${pad(p.min)}`;
}
