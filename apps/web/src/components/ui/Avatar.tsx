import { cn } from '@/lib/cn';

export type TintNo = 1 | 2 | 3;

/** Stable tint for an arbitrary id, so the same person or job keeps its colour. */
export function toneFor(key: string): TintNo {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return ((h % 3) + 1) as TintNo;
}

const tint: Record<TintNo, string> = { 1: 'bg-tint-1 text-tint-1-ink', 2: 'bg-tint-2 text-tint-2-ink', 3: 'bg-tint-3 text-tint-3-ink' };

const initials = (name?: string | null) =>
  (name ?? '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';

export function Avatar({ name, tone, size = 40, className }: { name?: string | null; tone?: TintNo; size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold', tint[tone ?? toneFor(name ?? '?')], className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/** Square tile with the first letter (job cards). */
export function Monogram({ label, tone, size = 48, className }: { label: string; tone: TintNo; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-tile font-display font-semibold', tint[tone], className)} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {(label.trim()[0] ?? '?').toUpperCase()}
    </span>
  );
}
