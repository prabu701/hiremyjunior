'use client';
import { isTerminal } from '@hmj/booking';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, PartyPopper, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { BookingFacts } from '@/components/app/BookingFacts';
import { Steps } from '@/components/app/Steps';
import { Alert } from '@/components/ui/Alert';
import { Avatar, toneFor } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Field';
import { Switch } from '@/components/ui/Misc';
import { PageSpinner } from '@/components/ui/Spinner';
import { handshakeSteps, invalidateBookings, stateLabel, stateTone, useBookingDetail, type BookingDetail } from '@/lib/bookings';
import { errorMessage, rpc } from '@/lib/rpc';

const TONE = { 1: 'neutral', 2: 'info', 3: 'success' } as const;
const BACK: Record<string, { href: string; label: string }> = {
  junior: { href: '/teen/requests', label: 'My jobs' },
  parent: { href: '/parent/approvals', label: 'Approvals' },
  employer: { href: '/employer/jobs', label: 'Jobs' },
  admin: { href: '/admin', label: 'Admin' },
};

/** The booking screen for whichever party is looking (teen, guardian or employer). */
export function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const sent = useSearchParams().get('sent') === '1';
  const q = useBookingDetail(id);
  if (q.isLoading) return <PageSpinner />;
  if (!q.data) return <Alert tone="danger">{errorMessage(q.error)}</Alert>;
  return <BookingView b={q.data} justSent={sent} />;
}

function BookingView({ b, justSent }: { b: BookingDetail; justSent: boolean }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const viewer = b.role === 'admin' ? 'parent' : b.role;
  const first = b.junior.name.split(' ')[0]!;
  const back = BACK[b.role]!;

  async function act(name: string, fn: () => Promise<unknown>) {
    setError(null);
    setBusy(name);
    try {
      await fn();
      await invalidateBookings(qc);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const working = ['checked_in', 'in_progress', 'work_ended'].includes(b.state);
  const canCancel = !isTerminal(b.state) && !working;

  const headline =
    b.role === 'junior'
      ? b.state === 'invited' ? `${b.employer.name} wants to hire you` : b.job.title
      : b.role === 'parent'
        ? `${first} ${b.origin === 'invited' ? 'was invited to' : 'wants to'} work “${b.job.title}”`
        : `${b.junior.name} · ${b.job.title}`;

  let actions: React.ReactNode = null;
  if (b.role === 'junior' && b.state === 'invited') {
    actions = (
      <div className="space-y-2.5">
        <Button block size="lg" loading={busy === 'accept'} onClick={() => act('accept', () => rpc('respond_to_invite', { booking_id: b.id, accept: true }))} data-testid="accept-invite">Accept invitation</Button>
        <Button block variant="ghost" loading={busy === 'decline'} onClick={() => act('decline', () => rpc('respond_to_invite', { booking_id: b.id, accept: false }))} data-testid="decline-invite">No thanks</Button>
      </div>
    );
  } else if (b.role === 'parent' && b.state === 'parent_review') {
    actions = (
      <div className="space-y-4">
        <Textarea label="Note to your teen (optional)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Only if you’re home by 9" maxLength={300} className="[&_textarea]:min-h-20" />
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" loading={busy === 'decline'} onClick={() => act('decline', () => rpc('parent_decide', { booking_id: b.id, approve: false, reason }))} data-testid="decline">Decline</Button>
          <Button loading={busy === 'approve'} onClick={() => act('approve', () => rpc('parent_decide', { booking_id: b.id, approve: true, reason }))} data-testid="approve">Approve</Button>
        </div>
      </div>
    );
  } else if (b.role === 'employer' && b.origin === 'applied' && ['applied', 'parent_review', 'parent_approved'].includes(b.state)) {
    actions = (
      <div className="space-y-2.5">
        {b.state === 'parent_approved' ? (
          <Button block size="lg" loading={busy === 'accept'} onClick={() => act('accept', () => rpc('employer_decide', { booking_id: b.id, accept: true }))} data-testid="accept">Confirm {first}</Button>
        ) : (
          <Alert tone="info">Waiting for {first}’s parent to approve. You’ll be able to confirm right after.</Alert>
        )}
        <Button block variant="ghost" loading={busy === 'decline'} onClick={() => act('decline', () => rpc('employer_decide', { booking_id: b.id, accept: false }))} data-testid="decline">Decline</Button>
      </div>
    );
  }

  const cancelLabel = b.role === 'employer' && b.state === 'invited' ? 'Withdraw request' : b.role === 'parent' ? `Cancel for ${first}` : 'Cancel';

  return (
    <div className="space-y-6">
      <Link href={back.href} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> {back.label}</Link>

      {justSent ? (
        <Card className="flex items-center gap-4 border-tint-3-ink/20 bg-tint-3 p-5 text-tint-3-ink">
          <PartyPopper className="size-7 shrink-0" />
          <div>
            <p className="font-display text-xl font-semibold">{b.origin === 'applied' ? 'Application sent!' : `Request sent to ${first}!`}</p>
            <p className="text-[14px] opacity-90">{b.origin === 'applied' ? `You applied for ${b.job.title}. Here’s what happens next.` : 'They’ll see it in their app, then a parent approves.'}</p>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={TONE[stateTone(b.state)]}>{stateLabel(b.state)}</Badge>
              <Badge tone="neutral">{b.track === 'casual' ? 'Household job' : 'Business job'}</Badge>
              {b.fast_path ? <Badge tone="info">Trusted employer</Badge> : null}
            </div>
            <h1 className="mt-3 text-[28px] leading-tight text-ink sm:text-[32px]">{headline}</h1>
          </header>
          <Card className="p-6">
            <Steps steps={handshakeSteps(b, viewer, { junior: viewer === 'junior' ? 'you' : first, employer: viewer === 'employer' ? 'You' : b.employer.name })} />
          </Card>
          {b.state === 'confirmed' ? <Alert tone="success" title="You’re all set">Everyone has each other’s details. Check-in and payment arrive in the job tracker on the day.</Alert> : null}
          <BookingFacts b={b} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
          {actions || (canCancel && b.role !== 'admin') || error ? (
            <Card className="space-y-4 p-6">
              {actions}
              {error ? <Alert tone="danger">{error}</Alert> : null}
              {canCancel && b.role !== 'admin' && !(b.role === 'junior' && b.state === 'invited') ? (
                <Button block variant="ghost" loading={busy === 'cancel'} onClick={() => act('cancel', () => rpc('cancel_booking', { booking_id: b.id, reason: b.role === 'parent' ? 'Cancelled by parent' : undefined }))} data-testid="cancel-booking">
                  {cancelLabel}
                </Button>
              ) : null}
            </Card>
          ) : null}

          <Card className="space-y-4 p-6">
            <Person name={b.employer.name} id={b.employer.id} sub={b.employer.kind === 'business' ? 'Verified business · WA minor work permit' : 'ID-verified · background-checked'} />
            <div className="h-px bg-line" />
            <Person name={b.junior.name} id={b.junior.id} sub={`Teen · age ${b.junior.age_band ?? '—'} · parent-approved account`} />
          </Card>

          {b.role === 'parent' && b.can_trust ? (
            <Card className="p-5">
              <Switch
                checked={!!b.trusted}
                onChange={(v) => act('trust', () => rpc('set_trusted_employer', { junior_id: b.junior.id, employer_id: b.employer.id, trusted: v }))}
                label={`Trust ${b.employer.name}`}
                description={`Future jobs with ${first} skip your approval — you can still cancel.`}
              />
            </Card>
          ) : null}
          {b.role === 'parent' ? (
            <p className="flex items-start gap-2 px-1 text-[12.5px] text-muted"><ShieldCheck className="mt-0.5 size-4 shrink-0" />Every step of this request is recorded, and you can see all of it.</p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Person({ name, id, sub }: { name: string; id: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} tone={toneFor(id)} size={42} />
      <div className="min-w-0">
        <p className="truncate text-[14.5px] font-semibold text-ink">{name}</p>
        <p className="flex items-center gap-1 text-[12.5px] text-muted"><Check className="size-3.5 text-tint-3-ink" />{sub}</p>
      </div>
    </div>
  );
}
