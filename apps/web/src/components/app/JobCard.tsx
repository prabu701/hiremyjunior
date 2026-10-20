import { MapPin, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { Monogram, toneFor } from '@/components/ui/Avatar';
import { dayLabel, distance, rate } from '@/lib/format';
import { jobImageUrl } from '@/lib/jobs';

export interface JobCardData {
  id: string;
  title: string;
  rate_cents: number;
  pay_type: 'hourly' | 'fixed';
  city: string;
  distance_mi?: number | null;
  image_path?: string | null;
  employer_name?: string | null;
  category_name?: string | null;
  next_shift_at?: string | null;
  schedule_note?: string | null;
}

/** Grid card for a job (search results, home feed). */
export function JobCard({ job, href, footer }: { job: JobCardData; href: string; footer?: React.ReactNode }) {
  return (
    <Link
      href={href}
      data-testid={`job-${job.id}`}
      className="group flex flex-col rounded-card border border-line bg-surface p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
    >
      <div className="flex items-start gap-4">
        {job.image_path ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase storage URL, already sized
          <img src={jobImageUrl(job.image_path)} alt="" className="size-14 shrink-0 rounded-tile object-cover" />
        ) : (
          <Monogram label={job.title} tone={toneFor(job.id)} size={56} />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] text-ink group-hover:text-accent-ink">{job.title}</h3>
          {job.employer_name ? <p className="truncate text-[13.5px] text-muted">{job.employer_name}</p> : null}
        </div>
        <p className="shrink-0 font-display text-[17px] font-semibold text-accent">{rate(job.rate_cents, job.pay_type)}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted">
        <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{distance(job.distance_mi, job.city)}</span>
        {job.next_shift_at || job.schedule_note ? (
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{job.schedule_note ?? (job.next_shift_at ? dayLabel(job.next_shift_at) : '')}</span>
        ) : null}
      </div>
      {footer ? <div className="mt-4 border-t border-line pt-3">{footer}</div> : null}
    </Link>
  );
}
