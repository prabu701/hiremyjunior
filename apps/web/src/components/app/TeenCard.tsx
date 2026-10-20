import { MapPin } from 'lucide-react';
import Link from 'next/link';
import { Avatar, toneFor } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { rateRange } from '@/lib/format';

export function TeenCard({ teen }: {
  teen: { id: string; display_name: string | null; age_band: string | null; distance_mi: number | null; skill_names: string[]; rate_min_cents: number | null; rate_max_cents: number | null; availability?: string | null };
}) {
  return (
    <Link
      href={`/employer/teens/${teen.id}`}
      data-testid={`teen-${teen.id}`}
      className="group flex flex-col rounded-card border border-line bg-surface p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
    >
      <div className="flex items-center gap-4">
        <Avatar name={teen.display_name} tone={toneFor(teen.id)} size={52} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] text-ink group-hover:text-accent-ink">{teen.display_name}</h3>
          <p className="flex items-center gap-1.5 text-[13px] text-muted"><MapPin className="size-3.5" />{teen.distance_mi ?? '—'} mi · age {teen.age_band ?? '—'}</p>
        </div>
        <p className="shrink-0 font-display text-[15px] font-semibold text-accent">{rateRange(teen.rate_min_cents, teen.rate_max_cents)}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {teen.skill_names.slice(0, 4).map((s) => <Chip key={s} label={s} className="h-7 px-3 text-[12px]" />)}
        {!teen.skill_names.length ? <span className="text-[13px] text-muted">No skills listed yet</span> : null}
      </div>
      {teen.availability ? <p className="mt-3 text-[13px] text-muted">Available: {teen.availability}</p> : null}
    </Link>
  );
}
