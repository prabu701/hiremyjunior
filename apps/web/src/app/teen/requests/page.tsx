'use client';
import { isTerminal } from '@hmj/booking';
import { CalendarCheck } from 'lucide-react';
import { BookingRow } from '@/components/app/BookingRow';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, PageHeader, SectionTitle, Skeleton } from '@/components/ui/Misc';
import { useMyBookings } from '@/lib/bookings';

export default function TeenRequests() {
  const q = useMyBookings();
  const rows = q.data ?? [];
  const groups = [
    { title: 'Waiting for your answer', items: rows.filter((b) => b.needs_action) },
    { title: 'In progress', items: rows.filter((b) => !b.needs_action && !isTerminal(b.state)) },
    { title: 'Past', items: rows.filter((b) => isTerminal(b.state)) },
  ];
  return (
    <div className="space-y-8">
      <PageHeader title="My jobs" subtitle="Applications, invitations and confirmed jobs." />
      {q.isLoading ? <Skeleton className="h-40" /> : null}
      {!q.isLoading && !rows.length ? (
        <EmptyState icon={<CalendarCheck className="size-6" />} title="Nothing yet" action={<ButtonLink href="/teen/search">Find a job</ButtonLink>}>
          When you apply for a job — or an employer invites you — it shows up here.
        </EmptyState>
      ) : null}
      {groups.map((g) => g.items.length ? (
        <section key={g.title} className="space-y-3">
          <SectionTitle>{g.title}</SectionTitle>
          {g.items.map((b) => (
            <BookingRow key={b.id} b={b} subtitle={`${b.employer_name} · ${b.city}${b.origin === 'invited' ? ' · invited you' : ''}`} href={`/teen/requests/${b.id}`} />
          ))}
        </section>
      ) : null)}
    </div>
  );
}
