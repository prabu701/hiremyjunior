'use client';
import { forwardRef, useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const control =
  'w-full rounded-control border border-line-strong bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted/70 ' +
  'transition-colors focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:bg-surface-2 disabled:text-muted ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger/15';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
}

function FieldShell({ id, label, hint, error, className, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-ink/80">{label}</label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[13px] text-danger">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12.5px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, FieldProps & Omit<ComponentProps<'input'>, 'className'>>(function Input(
  { label, hint, error, className, id: idProp, ...rest },
  ref,
) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <input ref={ref} id={id} className={cn(control, 'h-11')} aria-invalid={!!error || undefined} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} {...rest} />
    </FieldShell>
  );
});

export function Textarea({ label, hint, error, className, id: idProp, ...rest }: FieldProps & Omit<ComponentProps<'textarea'>, 'className'>) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <textarea id={id} className={cn(control, 'min-h-28 py-3 leading-relaxed')} aria-invalid={!!error || undefined} {...rest} />
    </FieldShell>
  );
}
