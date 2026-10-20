'use client';
import { Input } from '@/components/ui/Field';
import { maskUsDate } from '@/lib/dates';

export function DateInput({ label, value, onChange, error, disabled, hint, testId }: {
  label: string; value: string; onChange: (v: string) => void; error?: string | null; disabled?: boolean; hint?: string; testId?: string;
}) {
  return (
    <Input label={label} value={value} onChange={(e) => onChange(maskUsDate(e.target.value))} placeholder="MM/DD/YYYY" inputMode="numeric" maxLength={10} error={error} disabled={disabled} hint={hint} data-testid={testId} />
  );
}
