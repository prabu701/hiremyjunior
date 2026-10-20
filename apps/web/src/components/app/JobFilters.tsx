'use client';
import { Chip } from '@/components/ui/Chip';
import { useCategories } from '@/lib/jobs';

export function CategoryChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const categories = useCategories();
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Category">
      <Chip label="All" selected={value === 'all'} onClick={() => onChange('all')} />
      {(categories.data ?? []).map((c) => <Chip key={c.id} label={c.name} selected={value === c.id} onClick={() => onChange(c.id)} />)}
    </div>
  );
}
