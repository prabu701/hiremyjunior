'use client';
import { isTerminal } from '@hmj/booking';
import { CheckCircle2, UserPlus, Users } from 'lucide-react';
import { BookingRow } from '@/components/app/BookingRow';
import { Greeting } from '@/components/app/Greeting';
import { GuardianList } from '@/components/app/GuardianList';
import { RoleMismatchNotice } from '@/components/app/RoleMismatchNotice';
import { SetupChecklist } from '@/components/app/SetupChecklist';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, SectionTitle, Stat } from '@/components/ui/Misc';
import { useMyBookings } from '@/lib/bookings';
import { useGuardianships } from '@/lib/queries';

export default function ParentHome() {
  const bookings = useMyBookings().data ?? [];
  const pending = bookings.filter((b) => b.needs_action);
  const active = bookings.filter((b) => !b.needs_action && !isTerminal(b.state));
  const teens = (useGuardianships().data ?? []).filter((g) => g.status === 'active').length;

  return (
    <div className="space-y-10">
      <Greeting />
      <RoleMismatchNotice />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Waiting for you" value={pending.length} icon={<CheckCircle2 className="size-4" />} />
        <Stat label="Active jobs" value={active.length} />
        <Stat label="Linked teens" value={teens} icon={<Users className="size-4" />} />
      </div>

      {pending.length ? (
        <section className="space-y-3" data-testid="pending-approvals">
          <SectionTitle>Needs your approval</SectionTitle>
          {pending.map((b) => <BookingRow key={b.id} b={b} subtitle={`${b.junior_name?.split(' ')[0]} · ${b.employer_name} · ${b.city}`} href={`/parent/approvals/${b.id}`} />)}
        </section>
      ) : null}

      <SetupChecklist />

      <section className="space-y-4">
        <SectionTitle action={<ButtonLink href="/parent/teens/invite" variant="ghost" size="sm" icon={<UserPlus className="size-4" />}>Invite</ButtonLink>}>Your teens</SectionTitle>
        <GuardianList
          empty={
            <EmptyState icon={<UserPlus className="size-6" />} title="Link your teen" action={<ButtonLink href="/parent/teens/invite" data-testid="invite-teen">Get an invite code</ButtonLink>}>
              Your teen signs up, enters your code, and you confirm their date of birth.
            </EmptyState>
          }
        />
      </section>

      {active.length ? (
        <section className="space-y-3">
          <SectionTitle>Active jobs</SectionTitle>
          {active.map((b) => <BookingRow key={b.id} b={b} subtitle={`${b.junior_name?.split(' ')[0]} · ${b.employer_name}`} href={`/parent/approvals/${b.id}`} />)}
        </section>
      ) : null}
    </div>
  );
}
