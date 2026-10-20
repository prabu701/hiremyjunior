import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'accent' | 'neutral' | 'success' | 'info' | 'warning' | 'danger';

const tones: Record<Tone, string> = {
  accent: 'bg-accent-soft text-accent-ink',
  neutral: 'bg-surface-2 text-muted border border-line',
  success: 'bg-tint-3 text-tint-3-ink',
  info: 'bg-tint-2 text-tint-2-ink',
  warning: 'bg-tint-1 text-tint-1-ink',
  danger: 'bg-danger-soft text-danger',
};

export function Badge({ tone = 'neutral', icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-semibold whitespace-nowrap', tones[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

export function Dot({ tone = 'accent' }: { tone?: Tone }) {
  const c: Record<Tone, string> = { accent: 'bg-accent', neutral: 'bg-muted', success: 'bg-tint-3-ink', info: 'bg-tint-2-ink', warning: 'bg-tint-1-ink', danger: 'bg-danger' };
  return <span className={cn('inline-block size-2 rounded-full', c[tone])} aria-hidden />;
}
