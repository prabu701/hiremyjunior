'use client';
import { CalendarDays, Clock, MapPin, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar, Monogram, toneFor } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { KeyValues } from '@/components/ui/Misc';
import { distance, hoursBetween, rate, shiftLabel } from '@/lib/format';
import { jobImageUrl, type JobDetail } from '@/lib/jobs';

/** Two-column job page: content on the left, a sticky action panel (`aside`) on the right. */
export function JobDetailView({ job, aside, above }: { job: JobDetail; aside: ReactNode; above?: ReactNode }) {
  const upcoming = job.shifts.filter((s) => new Date(s.end_at) > new Date());
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-8">
        {above}
        <header className="flex items-start gap-5">
          {job.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={jobImageUrl(job.images[0])} alt="" className="size-20 shrink-0 rounded-card object-cover" />
          ) : (
            <Monogram label={job.title} tone={toneFor(job.id)} size={80} />
          )}
          <div className="min-w-0">
            <Badge tone="neutral">{job.category_name}</Badge>
            <h1 className="mt-2 text-[30px] leading-tight text-ink sm:text-[36px]">{job.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px] text-muted">
              <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{distance(job.distance_mi, job.city) || job.city}</span>
              {job.schedule_note ? <span className="inline-flex items-center gap-1.5"><Clock className="size-4" />{job.schedule_note}</span> : null}
            </div>
          </div>
        </header>

        {job.images.length > 1 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {job.images.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p} src={jobImageUrl(p)} alt="" className="aspect-[4/3] w-full rounded-card object-cover" />
            ))}
          </div>
        ) : null}

        <section>
          <h2 className="text-lg text-ink">About this job</h2>
          <p className="mt-3 whitespace-pre-line text-[15.5px] leading-relaxed text-ink/85">{job.description}</p>
        </section>

        <section>
          <h2 className="text-lg text-ink">Upcoming dates</h2>
          {upcoming.length ? (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {upcoming.map((s) => (
                <li key={s.id} className="flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3">
                  <span className="flex size-9 items-center justify-center rounded-tile bg-tint-2 text-tint-2-ink"><CalendarDays className="size-4.5" /></span>
                  <span>
                    <span className="block text-[14px] font-semibold text-ink">{shiftLabel(s.start_at, s.end_at)}</span>
                    <span className="block text-[12.5px] text-muted">{hoursBetween(s.start_at, s.end_at)} hours</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14px] text-muted">No upcoming dates.</p>
          )}
        </section>

        <Card className="flex items-center gap-4 p-5">
          <Avatar name={job.employer.name} tone={toneFor(job.employer.id)} size={52} />
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-semibold text-ink">{job.employer.name}</p>
            <p className="flex items-center gap-1.5 text-[13.5px] text-muted">
              <ShieldCheck className="size-4 text-tint-3-ink" />
              {job.employer.kind === 'business' ? 'Verified Washington business · minor work permit on file' : 'ID-verified household · background check passed'}
            </p>
          </div>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-8 lg:self-start">
        <Card className="space-y-5 p-6">
          <div>
            <p className="text-[13px] font-semibold text-muted">Pay</p>
            <p className="font-display text-[34px] font-semibold leading-tight text-ink">{rate(job.rate_cents, job.pay_type)}</p>
          </div>
          <KeyValues
            className="border-0 bg-surface-2"
            rows={[
              { label: 'Where', value: job.address?.line ?? job.city },
              { label: 'Type', value: job.track === 'casual' ? 'Household job' : 'Business job' },
            ]}
          />
          {aside}
        </Card>
      </aside>
    </div>
  );
}
