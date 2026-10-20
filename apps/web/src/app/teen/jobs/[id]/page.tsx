'use client';
import { isTerminal, type BookingState } from '@hmj/booking';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { JobDetailView } from '@/components/app/JobDetail';
import { Alert } from '@/components/ui/Alert';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Field';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth';
import { invalidateBookings, stateLabel } from '@/lib/bookings';
import { useJobDetail } from '@/lib/jobs';
import { errorMessage, rpc } from '@/lib/rpc';

export default function TeenJob() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const job = useJobDetail(id);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (job.isLoading) return <PageSpinner />;
  if (!job.data) return <Alert tone="danger">{errorMessage(job.error)}</Alert>;
  const mine = (job.data as unknown as { my_booking?: { id: string; state: BookingState } | null }).my_booking;
  const open = mine && !isTerminal(mine.state);
  const active = profile?.status === 'active';

  async function apply() {
    setError(null);
    setBusy(true);
    try {
      const bookingId = await rpc('apply_to_job', { job_id: id, message });
      await invalidateBookings(qc);
      router.push(`/teen/requests/${bookingId}?sent=1`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/teen/search" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> All jobs</Link>
      <JobDetailView
        job={job.data}
        aside={
          open ? (
            <div className="space-y-3">
              <Alert tone="info">You’ve already asked about this job — {stateLabel(mine.state).toLowerCase()}.</Alert>
              <ButtonLink href={`/teen/requests/${mine.id}`} block>View your request</ButtonLink>
            </div>
          ) : !active ? (
            <div className="space-y-3">
              <Alert tone="warning">Finish setting up your account before you can apply.</Alert>
              <ButtonLink href="/teen" variant="secondary" block>See what’s left</ButtonLink>
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea label="Say hi (optional)" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Why you’d be great for this job…" maxLength={500} hint="Your parent sees this too. Keep phone numbers and emails out." data-testid="application-message" />
              {error ? <Alert tone="danger">{error}</Alert> : null}
              <Button block size="lg" loading={busy} onClick={apply} icon={<Send className="size-4" />} data-testid="apply">Apply for this job</Button>
              <p className="text-center text-[12.5px] text-muted">Your parent approves before anything is confirmed.</p>
            </div>
          )
        }
      />
    </div>
  );
}
