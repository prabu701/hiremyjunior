'use client';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-[13px] font-semibold text-muted">{eyebrow}</p> : null}
        <h1 className="text-[28px] leading-tight text-ink sm:text-[32px]">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-2xl text-[15px] text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function KeyValues({ rows, className }: { rows: { label: string; value: ReactNode; accent?: boolean }[]; className?: string }) {
  return (
    <dl className={cn('divide-y divide-line rounded-card border border-line bg-surface', className)}>
      {rows.map((r) => (
        <div key={r.label} className="flex items-start justify-between gap-6 px-4 py-3">
          <dt className="text-[13.5px] text-muted">{r.label}</dt>
          <dd className={cn('text-right text-[14px] font-semibold', r.accent ? 'text-accent' : 'text-ink')}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Stat({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-muted">{icon}{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold text-ink">{value}</div>
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-tile bg-accent-soft text-accent-ink">{icon}</div>
      <h3 className="text-lg text-ink">{title}</h3>
      {children ? <p className="mt-1 max-w-sm text-[14px] text-muted">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-card bg-surface-2', className)} aria-hidden />;
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center gap-4 text-left">
      <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-line-strong')}>
        <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
      <span>
        <span className="block text-[14px] font-semibold text-ink">{label}</span>
        {description ? <span className="block text-[13px] text-muted">{description}</span> : null}
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string; hint?: string; icon?: ReactNode }[]; value: T | null; onChange: (v: T) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-3', options.length > 2 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2')}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-col gap-1 rounded-card border-2 bg-surface p-4 text-left transition-all',
              on ? 'border-accent shadow-[0_0_0_4px_var(--accent-soft)]' : 'border-line hover:border-line-strong',
            )}
          >
            {o.icon ? <span className={cn('mb-1', on ? 'text-accent' : 'text-muted')}>{o.icon}</span> : null}
            <span className="font-display text-[15px] font-semibold text-ink">{o.label}</span>
            {o.hint ? <span className="text-[12.5px] leading-snug text-muted">{o.hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
