// Display formatting. All job times are shown in Washington time, whatever the device's zone.
const TZ = 'America/Los_Angeles';

export function money(cents: number | null | undefined): string {
  if (cents == null) return '—';
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export function rate(cents: number, payType: 'hourly' | 'fixed' = 'hourly'): string {
  return payType === 'hourly' ? `${money(cents)}/hr` : `${money(cents)} total`;
}

export function rateRange(min: number | null | undefined, max: number | null | undefined): string {
  if (min == null && max == null) return 'Not set';
  if (min != null && max != null && min !== max) return `${money(min)}–${money(max).slice(1)}/hr`;
  return `${money(min ?? max)}/hr`;
}

export function distance(mi: number | null | undefined, city?: string | null): string {
  const d = mi == null ? null : mi < 0.1 ? '<0.1 mi' : `${mi} mi`;
  return [d, city].filter(Boolean).join(' · ');
}

const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

function shortTime(d: Date): string {
  return timeFmt.format(d).replace(':00', '').replace(' ', ' ');
}

/** "Sat, Oct 3 · 9 AM–11 AM" */
export function shiftLabel(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  return `${dayFmt.format(s)} · ${shortTime(s)}–${shortTime(e)}`;
}

export function dayLabel(iso: string): string {
  return dayFmt.format(new Date(iso));
}

/** Hours between two ISO timestamps, to one decimal. */
export function hoursBetween(startIso: string, endIso: string): number {
  return Math.round(((new Date(endIso).getTime() - new Date(startIso).getTime()) / 36e5) * 10) / 10;
}

/** "9:00" / "9am" / "9:30 PM" / "21:00" → "HH:MM" (24h), or null. */
export function parseTime(input: string): string | null {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?\s*$/i.exec(input);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? '0');
  const ap = m[3]?.toLowerCase();
  if (min > 59 || h > 23 || (ap && (h < 1 || h > 12))) return null;
  if (ap?.startsWith('p') && h < 12) h += 12;
  if (ap?.startsWith('a') && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** "+14255550123" → "(425) 555-0123" */
export function phone(e164: string | null | undefined): string {
  if (!e164) return '';
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}
