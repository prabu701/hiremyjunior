'use client';
import { Briefcase, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { Monogram, toneFor } from '@/components/ui/Avatar';
import { Badge, type Tone } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui/Misc';
import { useMyBookings } from '@/lib/bookings';
import { dayLabel, rate } from '@/lib/format';
import { useMyJobs } from '@/lib/jobs';

const STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: 'Draft', tone: 'neutral' }, posted: { label: 'Posted', tone: 'success' }, filled: { label: 'Filled', tone: 'info' }, closed: { label: 'Closed', tone: 'neutral' },
};

export default function EmployerJobs() {
  const jobs = useMyJobs();
  const bookings = useMyBookings().data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader title="Your jobs" actions={<ButtonLink href="/employer/jobs/new" icon={<Plus className="size-4" />} data-testid="post-job">Post a job</ButtonLink>} />
      {jobs.isLoading ? <Skeleton className="h-48" /> : null}
      {jobs.data?.length === 0 ? (
        <EmptyState icon={<Briefcase className="size-6" />} title="No jobs yet" action={<ButtonLink href="/employer/jobs/new">Post your first job</ButtonLink>}>Describe the work, set a rate and pick the dates.</EmptyState>
      ) : null}
      {jobs.data?.length ? (
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-soft">
          <div className="hidden grid-cols-[1fr_120px_130px_150px_110px] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-[12.5px] font-semibold uppercase tracking-wider text-muted md:grid">
            <span>Job</span><span>Rate</span><span>Next date</span><span>Applicants</span><span>Status</span>
          </div>
          <ul className="divide-y divide-line">
            {jobs.data.map((j) => {
              const next = j.job_shifts.map((s) => s.start_at).filter((s) => new Date(s) > new Date()).sort()[0];
              const forJob = bookings.filter((b) => b.job_id === j.id);
              const waiting = forJob.filter((b) => b.needs_action).length;
              return (
                <li key={j.id}>
                  <Link href={`/employer/jobs/${j.id}`} className="grid items-center gap-2 px-5 py-4 transition-colors hover:bg-surface-2 md:grid-cols-[1fr_120px_130px_150px_110px] md:gap-4" data-testid={`my-job-${j.id}`}>
                    <span className="flex min-w-0 items-center gap-3">
                      <Monogram label={j.title} tone={toneFor(j.id)} size={40} />
                      <span className="truncate text-[15px] font-semibold text-ink">{j.title}</span>
                    </span>
                    <span className="text-[14px] font-semibold text-accent">{rate(j.rate_cents, j.pay_type)}</span>
                    <span className="text-[14px] text-muted">{next ? dayLabel(next) : '—'}</span>
                    <span className="flex items-center gap-2 text-[14px] text-muted">
                      <Users className="size-4" />{forJob.length}
                      {waiting ? <Badge tone="accent">{waiting} to confirm</Badge> : null}
                    </span>
                    <span><Badge tone={STATUS[j.status]!.tone}>{STATUS[j.status]!.label}</Badge></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
