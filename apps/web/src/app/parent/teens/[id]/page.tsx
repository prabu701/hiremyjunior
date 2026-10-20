'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { DateInput } from '@/components/app/DateInput';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KeyValues } from '@/components/ui/Misc';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth';
import { formatUsDate, parseUsDate } from '@/lib/dates';
import { invalidateSetup } from '@/lib/queries';
import { errorMessage, rpc, unwrap, unwrapOne } from '@/lib/rpc';
import { getSupabase } from '@/lib/supabase/client';

/** Confirm a teen's link request and attest their date of birth (or view / remove an active link). */
export default function TeenLink() {
  const { id } = useParams<{ id: string }>();
  const { refreshProfile } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const [dob, setDob] = useState('');
  const [attested, setAttested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'confirm' | 'remove' | null>(null);

  const q = useQuery({
    queryKey: ['guardianship', id],
    queryFn: async () => {
      const g = unwrapOne(await getSupabase().from('guardianships').select('*, junior:profiles!guardianships_junior_id_fkey(full_name, email)').eq('id', id).single());
      const j = unwrap(await getSupabase().from('juniors').select('*').eq('profile_id', g.junior_id).maybeSingle());
      return { g, j };
    },
  });

  if (q.isLoading) return <PageSpinner />;
  if (!q.data) return <Alert tone="danger">This link request no longer exists.</Alert>;
  const { g, j } = q.data;
  const name = g.junior?.full_name ?? 'your teen';
  const first = name.split(' ')[0];
  const active = g.status === 'active';

  async function run(kind: 'confirm' | 'remove') {
    setError(null);
    const iso = parseUsDate(dob);
    if (kind === 'confirm' && !iso) return setError('Enter the date of birth as MM/DD/YYYY.');
    if (kind === 'confirm' && !attested) return setError('Please confirm you are their parent or legal guardian.');
    setBusy(kind);
    try {
      if (kind === 'confirm') await rpc('confirm_guardianship', { guardianship_id: g.id, dob: iso! });
      else await rpc('remove_guardianship', { guardianship_id: g.id });
      await Promise.all([invalidateSetup(qc), refreshProfile()]);
      router.push('/parent/teens');
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/parent/teens" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> My teens</Link>
      <Card className="p-7 sm:p-9">
        <div className="flex items-center gap-4">
          <Avatar name={name} size={64} />
          <div>
            <h1 className="text-[26px] text-ink">{name}</h1>
            <Badge tone={active ? 'success' : 'warning'}>{active ? 'Linked' : 'Wants to link with you'}</Badge>
          </div>
        </div>
        <KeyValues
          className="mt-6"
          rows={[
            { label: 'Email', value: g.junior?.email ?? '' },
            { label: 'School', value: j?.school_name ?? '—' },
            { label: 'Lives in', value: j ? `${j.city} ${j.zip}` : '—' },
            active ? { label: 'Date of birth', value: formatUsDate(j?.dob) } : { label: `${first} entered`, value: formatUsDate(j?.dob_claimed) },
          ]}
        />

        {active ? (
          <Alert tone="success" className="mt-6">You’re linked. You’ll approve each job {first} applies for.</Alert>
        ) : (
          <div className="mt-7 space-y-5">
            <DateInput label={`${first}’s date of birth`} value={dob} onChange={setDob} hint="Type it yourself — it’s how we verify their age." testId="attest-dob" />
            <label className="flex cursor-pointer items-start gap-3 rounded-card border border-line bg-surface-2 p-4">
              <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-0.5 size-4.5 accent-[var(--accent)]" data-testid="attest-checkbox" />
              <span className="text-[14.5px] text-ink">I’m {first}’s parent or legal guardian, and this date of birth is correct.</span>
            </label>
            <Alert tone="safety">Your confirmation is recorded with your verified identity.</Alert>
          </div>
        )}
        {error ? <Alert tone="danger" className="mt-5">{error}</Alert> : null}
        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row-reverse">
          {!active ? <Button size="lg" loading={busy === 'confirm'} onClick={() => run('confirm')} icon={<ShieldCheck className="size-4.5" />} data-testid="confirm-teen">Confirm {first}</Button> : null}
          <Button size="lg" variant={active ? 'danger' : 'ghost'} loading={busy === 'remove'} onClick={() => run('remove')} data-testid="remove-teen">
            {active ? 'Remove link' : 'This isn’t my teen'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
