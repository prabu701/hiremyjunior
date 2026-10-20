'use client';
import { cn } from '@/lib/cn';

export function Chip({ label, selected, onClick, className }: { label: string; selected?: boolean; onClick?: () => void; className?: string }) {
  const cls = cn(
    'inline-flex h-9 items-center rounded-pill px-4 text-[13px] font-semibold whitespace-nowrap transition-colors',
    selected ? 'bg-ink text-canvas' : 'bg-surface text-muted border border-line hover:border-line-strong hover:text-ink',
    className,
  );
  if (!onClick) return <span className={cls}>{label}</span>;
  return (
    <button type="button" role="checkbox" aria-checked={!!selected} onClick={onClick} className={cls}>
      {label}
    </button>
  );
}

export function ChipGroup<T extends string>({ options, values, onToggle, label }: { options: { value: T; label: string }[]; values: T[]; onToggle?: (v: T) => void; label?: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={values.includes(o.value)} onClick={onToggle ? () => onToggle(o.value) : undefined} />
      ))}
    </div>
  );
}
