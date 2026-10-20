'use client';
import { useRef } from 'react';
import { cn } from '@/lib/cn';

/** Digit boxes (6 by default). Supports typing, backspace navigation and pasting the whole code. */
export function CodeInput({ value, onChange, onComplete, invalid, disabled, length = 6 }: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  length?: number;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  function set(next: string) {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    refs.current[Math.min(clean.length, length - 1)]?.focus();
  }

  return (
    <div className={cn('flex gap-2', length <= 4 ? 'max-w-[280px] gap-3' : 'justify-between')} role="group" aria-label={`${length}-digit code`}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          data-testid={`code-${i}`}
          disabled={disabled}
          autoFocus={i === 0}
          maxLength={length}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            if (!v) return;
            // Typing (or pasting) at position i overwrites from i onward.
            set((value.slice(0, i) + v).slice(0, length));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault();
              const cut = d ? i : Math.max(0, i - 1);
              onChange(value.slice(0, cut));
              refs.current[cut]?.focus();
            } else if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus();
            else if (e.key === 'ArrowRight') refs.current[i + 1]?.focus();
          }}
          onFocus={(e) => e.target.select()}
          className={cn(
            'h-15 w-full min-w-0 rounded-control border-2 bg-surface text-center font-display text-[26px] font-semibold text-ink transition-all',
            'focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15',
            invalid ? 'border-danger' : d ? 'border-line-strong' : 'border-line',
          )}
        />
      ))}
    </div>
  );
}
