'use client';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Send, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Avatar, toneFor } from '@/components/ui/Avatar';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChipGroup } from '@/components/ui/Chip';
import { Textarea } from '@/components/ui/Field';
import { KeyValues } from '@/components/ui/Misc';
import { PageSpinner } from '@/components/ui/Spinner';
import { invalidateBookings } from '@/lib/bookings';
import { rateRange } from '@/lib/format';
import { useJuniorCard, useMyJobs } from '@/lib/jobs';
import { errorMessage, rpc } from '@/lib/rpc';

export default function TeenProfileForEmployer() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const router = useRouter();
  const card = useJuniorCard(id);
  const jobs = useMyJobs();
  const posted = (jobs.data ?? []).filter((j) => j.status === 'posted');
  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (card.isLoading) return <PageSpinner />;
  if (!card.data) return <Alert tone="danger">{errorMessage(card.error)}</Alert>;
  const c = card.data;
  const first = c.display_name.split(' ')[0];

  async function send() {
    if (!jobId) return setError('Pick which job this is for.');
    setError(null);
    setBusy(true);
    try {
      const bookingId = await rpc('invite_junior', { job_id: jobId, junior_id: id, message });
      await invalidateBookings(qc);
      router.push(`/employer/requests/${bookingId}?sent=1`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/employer/teens" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Find teens</Link>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <header className="flex items-center gap-5">
            <Avatar name={c.display_name} tone={toneFor(c.id)} size={88} />
            <div>
              <h1 className="text-[32px] leading-tight text-ink">{c.display_name}</h1>
              <p className="mt-1 flex items-center gap-1.5 text-[14.5px] text-muted"><MapPin className="size-4" />{c.distance_mi ?? '—'} mi away · {c.city} · age {c.age_band ?? '—'}</p>
            </div>
          </header>
          {c.bio ? <p className="text-[16px] leading-relaxed text-ink/85">{c.bio}</p> : null}
          <section>
            <h2 className="mb-3 text-lg text-ink">Skills</h2>
            <ChipGroup options={c.skill_names.map((s) => ({ value: s, label: s }))} values={[]} />
          </section>
          <KeyValues rows={[{ label: 'Hourly rate', value: rateRange(c.rate_min_cents, c.rate_max_cents), accent: true }, { label: 'Availability', value: c.availability ?? '—' }]} />
          <Alert tone="safety">Every teen on HireMyJunior is linked to an ID-verified parent, who approves each job. Full name and contact details are shared once a job is confirmed.</Alert>
        </div>
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <Card className="space-y-5 p-6">
            <h2 className="text-lg text-ink">Send {first} a hire request</h2>
            {!jobs.isLoading && !posted.length ? (
              <>
                <Alert tone="info">Hire requests are always for a specific job. Post one first.</Alert>
                <ButtonLink href="/employer/jobs/new" block>Post a job</ButtonLink>
              </>
            ) : (
              <>
                <div>
                  <p className="mb-2.5 text-[13px] font-semibold text-ink/80">Which job?</p>
                  <ChipGroup label="Job" options={posted.map((j) => ({ value: j.id, label: j.title }))} values={jobId ? [jobId] : []} onToggle={setJobId} />
                </div>
                <Textarea label="Message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="We’d love your help on Saturday mornings!" maxLength={500} />
                {error ? <Alert tone="danger">{error}</Alert> : null}
                <Button block size="lg" loading={busy} onClick={send} icon={<Send className="size-4" />} data-testid="send-hire-request">Send request</Button>
                <p className="flex items-start gap-2 text-[12.5px] text-muted"><ShieldCheck className="mt-0.5 size-4 shrink-0" />{first} accepts first, then a parent approves.</p>
              </>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
