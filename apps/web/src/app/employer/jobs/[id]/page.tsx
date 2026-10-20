'use client';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { BookingRow } from '@/components/app/BookingRow';
import { JobDetailView } from '@/components/app/JobDetail';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { SectionTitle } from '@/components/ui/Misc';
import { PageSpinner } from '@/components/ui/Spinner';
import { useMyBookings } from '@/lib/bookings';
import { useJobDetail } from '@/lib/jobs';
import { errorMessage, rpc } from '@/lib/rpc';

export default function EmployerJob() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const job = useJobDetail(id);
  const applicants = (useMyBookings().data ?? []).filter((b) => b.job_id === id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (job.isLoading) return <PageSpinner />;
  if (!job.data) return <Alert tone="danger">{errorMessage(job.error)}</Alert>;
  const j = job.data;

  async function setStatus(status: 'posted' | 'closed') {
    setError(null);
    setBusy(true);
    try {
      await rpc('set_job_status', { job_id: j.id, status });
      await Promise.all(['my-jobs', 'job'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/employer/jobs" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Your jobs</Link>
      <JobDetailView
        job={j}
        above={
          <section className="space-y-3">
            <SectionTitle><span className="inline-flex items-center gap-2"><Users className="size-5 text-accent" />Applicants &amp; requests ({applicants.length})</span></SectionTitle>
            {applicants.length ? (
              applicants.map((b) => <BookingRow key={b.id} b={b} title={b.junior_name ?? 'Teen'} subtitle={b.origin === 'invited' ? 'You invited them' : 'Applied'} href={`/employer/requests/${b.id}`} />)
            ) : (
              <p className="rounded-card border border-dashed border-line-strong px-5 py-6 text-center text-[14px] text-muted">
                No applicants yet. <Link href="/employer/teens" className="font-semibold text-accent-ink hover:underline">Invite teens nearby →</Link>
              </p>
            )}
          </section>
        }
        aside={
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-muted">Status</span>
              <Badge tone={j.status === 'posted' ? 'success' : 'neutral'}>{j.status[0]!.toUpperCase() + j.status.slice(1)}</Badge>
            </div>
            {error ? <Alert tone="danger">{error}</Alert> : null}
            {j.status !== 'filled' && j.status !== 'closed' ? <ButtonLink href={`/employer/jobs/${j.id}/edit`} variant="secondary" block icon={<Pencil className="size-4" />} data-testid="edit-job">Edit job</ButtonLink> : null}
            {j.status === 'posted' ? <Button variant="ghost" block loading={busy} onClick={() => setStatus('closed')} data-testid="close-job">Close job</Button> : null}
            {j.status === 'closed' || j.status === 'draft' ? <Button block loading={busy} onClick={() => setStatus('posted')} data-testid="repost-job">Post job</Button> : null}
          </div>
        }
      />
    </div>
  );
}
