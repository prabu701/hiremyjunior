'use client';
import { Briefcase, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { BookingRow } from '@/components/app/BookingRow';
import { Greeting } from '@/components/app/Greeting';
import { JobCard } from '@/components/app/JobCard';
import { CategoryChips } from '@/components/app/JobFilters';
import { RoleMismatchNotice } from '@/components/app/RoleMismatchNotice';
import { SetupChecklist } from '@/components/app/SetupChecklist';
import { Alert } from '@/components/ui/Alert';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, SectionTitle, Skeleton } from '@/components/ui/Misc';
import { useAuth } from '@/lib/auth';
import { useMyBookings } from '@/lib/bookings';
import { useJobSearch } from '@/lib/jobs';
import { errorMessage } from '@/lib/rpc';

export default function TeenHome() {
  const { profile } = useAuth();
  const [category, setCategory] = useState('all');
  const jobs = useJobSearch({ category: category === 'all' ? null : category });
  const invites = (useMyBookings().data ?? []).filter((b) => b.needs_action);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <Greeting />
        <Link href="/teen/search" className="flex h-12 w-full items-center gap-3 rounded-control border border-line bg-surface px-4 text-[14.5px] text-muted shadow-soft transition-colors hover:border-line-strong sm:w-80">
          <Search className="size-4.5" /> Search jobs near you
        </Link>
      </div>
      <RoleMismatchNotice />
      {profile?.status !== 'active' ? <SetupChecklist title="Before you can apply" subtitle="You can browse now — finish these to start applying." /> : null}

      {invites.length ? (
        <section className="space-y-3">
          <SectionTitle>Waiting for your answer</SectionTitle>
          {invites.map((b) => <BookingRow key={b.id} b={b} subtitle={`${b.employer_name} invited you · ${b.city}`} href={`/teen/requests/${b.id}`} />)}
        </section>
      ) : null}

      <section className="space-y-5">
        <SectionTitle action={<ButtonLink href="/teen/search" variant="ghost" size="sm">See all</ButtonLink>}>Jobs near you</SectionTitle>
        <CategoryChips value={category} onChange={setCategory} />
        {jobs.error ? <Alert tone="danger">{errorMessage(jobs.error)}</Alert> : null}
        {jobs.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-36" />)}</div>
        ) : jobs.data?.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobs.data.slice(0, 9).map((j) => <JobCard key={j.id} job={j} href={`/teen/jobs/${j.id}`} />)}
          </div>
        ) : (
          <EmptyState icon={<Briefcase className="size-6" />} title="No jobs here yet" action={<ButtonLink href="/teen/profile" variant="secondary">Widen your search radius</ButtonLink>}>
            Try another category, or look further from home.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
