'use client';
import { isTerminal } from '@hmj/booking';
import { CheckCircle2 } from 'lucide-react';
import { BookingRow } from '@/components/app/BookingRow';
import { EmptyState, PageHeader, SectionTitle, Skeleton } from '@/components/ui/Misc';
import { useMyBookings } from '@/lib/bookings';

export default function Approvals() {
  const q = useMyBookings();
  const rows = q.data ?? [];
  const groups = [
    { title: 'Needs your approval', items: rows.filter((b) => b.needs_action) },
    { title: 'Active', items: rows.filter((b) => !b.needs_action && !isTerminal(b.state)) },
    { title: 'Past', items: rows.filter((b) => isTerminal(b.state)) },
  ];
  return (
    <div className="space-y-8">
      <PageHeader title="Approvals" subtitle="Every job your teen applies for — or is invited to — comes here first." />
      {q.isLoading ? <Skeleton className="h-40" /> : null}
      {!q.isLoading && !rows.length ? (
        <EmptyState icon={<CheckCircle2 className="size-6" />} title="Nothing to approve">When your teen applies for a job, you’ll review it here.</EmptyState>
      ) : null}
      {groups.map((g) => g.items.length ? (
        <section key={g.title} className="space-y-3">
          <SectionTitle>{g.title}</SectionTitle>
          {g.items.map((b) => (
            <BookingRow key={b.id} b={b} subtitle={`${b.junior_name?.split(' ')[0]} · ${b.employer_name}${b.fast_path ? ' · auto-approved (trusted)' : ''}`} href={`/parent/approvals/${b.id}`} />
          ))}
        </section>
      ) : null)}
    </div>
  );
}
