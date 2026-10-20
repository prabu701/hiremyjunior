'use client';
import { isTerminal } from '@hmj/booking';
import { Briefcase, Plus, Search, UserCheck } from 'lucide-react';
import { BookingRow } from '@/components/app/BookingRow';
import { Greeting } from '@/components/app/Greeting';
import { RoleMismatchNotice } from '@/components/app/RoleMismatchNotice';
import { SetupChecklist } from '@/components/app/SetupChecklist';
import { ButtonLink } from '@/components/ui/Button';
import { SectionTitle, Stat } from '@/components/ui/Misc';
import { useAuth } from '@/lib/auth';
import { useMyBookings } from '@/lib/bookings';
import { useMyJobs } from '@/lib/jobs';
import { useMyEmployer } from '@/lib/queries';

export default function EmployerHome() {
  const { profile } = useAuth();
  const employer = useMyEmployer().data;
  const jobs = useMyJobs().data ?? [];
  const bookings = useMyBookings().data ?? [];
  const waiting = bookings.filter((b) => b.needs_action);
  const open = bookings.filter((b) => !isTerminal(b.state)).length;
  const active = profile?.status === 'active';

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <Greeting subtitle={employer?.display_name} />
        {active ? (
          <div className="flex gap-2">
            <ButtonLink href="/employer/teens" variant="secondary" icon={<Search className="size-4" />}>Find teens</ButtonLink>
            <ButtonLink href="/employer/jobs/new" icon={<Plus className="size-4" />}>Post a job</ButtonLink>
          </div>
        ) : null}
      </div>
      <RoleMismatchNotice />
      <SetupChecklist title="Before you can post jobs" />
      {active ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Posted jobs" value={jobs.filter((j) => j.status === 'posted').length} icon={<Briefcase className="size-4" />} />
          <Stat label="Open requests" value={open} />
          <Stat label="Ready to confirm" value={waiting.length} icon={<UserCheck className="size-4" />} />
        </div>
      ) : null}
      {waiting.length ? (
        <section className="space-y-3">
          <SectionTitle>Ready for you to confirm</SectionTitle>
          {waiting.map((b) => <BookingRow key={b.id} b={b} title={b.junior_name ?? 'Teen'} subtitle={`${b.job_title} · parent approved`} href={`/employer/requests/${b.id}`} />)}
        </section>
      ) : null}
    </div>
  );
}
