import { TextField } from '@hmj/ui';

/** MM/DD/YYYY text entry that works identically on web and native. Emits ISO (YYYY-MM-DD) or null. */
export function parseUsDate(input: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  if (d.getUTCFullYear() !== Number(yyyy) || d.getUTCMonth() !== Number(mm) - 1 || d.getUTCDate() !== Number(dd)) return null;
  return `${yyyy}-${mm}-${dd}`;
}

export function formatUsDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
}

function mask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function DateField({ label, value, onChange, error, testID, editable = true }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  testID?: string;
  editable?: boolean;
}) {
  return (
    <TextField
      testID={testID}
      label={label}
      value={value}
      onChangeText={(v) => onChange(mask(v))}
      placeholder="MM/DD/YYYY"
      keyboardType="number-pad"
      maxLength={10}
      error={error}
      editable={editable}
    />
  );
}
