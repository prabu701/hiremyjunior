'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Field';
import { KeyValues, PageHeader } from '@/components/ui/Misc';
import { PageSpinner } from '@/components/ui/Spinner';
import { KIND_LABEL } from '@/lib/admin';
import { formatUsDate } from '@/lib/dates';
import { errorMessage, rpc, unwrap, unwrapOne } from '@/lib/rpc';
import { getSupabase } from '@/lib/supabase/client';

export default function Review() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  const q = useQuery({
    queryKey: ['admin-review', id],
    queryFn: async () => {
      const sb = getSupabase();
      // never `*`: verifications.secret is not client-readable
      const v = unwrapOne(await sb.from('verifications').select('id, subject_id, kind, status, provider, evidence_path, details, created_at').eq('id', id).single());
      const p = unwrap(await sb.from('profiles').select('full_name, email, role').eq('id', v.subject_id).maybeSingle());
      const j = unwrap(await sb.from('juniors').select('dob, dob_claimed, school_name').eq('profile_id', v.subject_id).maybeSingle());
      const e = unwrap(await sb.from('employers').select('legal_name, ubi, display_name').eq('profile_id', v.subject_id).maybeSingle());
      const doc = v.evidence_path ? (await sb.storage.from('verification-docs').createSignedUrl(v.evidence_path, 300)).data?.signedUrl ?? null : null;
      return { v, p, j, e, doc };
    },
  });

  if (q.isLoading) return <PageSpinner />;
  if (!q.data) return <Alert tone="danger">{errorMessage(q.error)}</Alert>;
  const { v, p, j, e, doc } = q.data;
  const simulated = v.provider.startsWith('mock');
  const details = (v.details ?? {}) as Record<string, string>;

  async function decide(approve: boolean) {
    setError(null);
    setBusy(approve ? 'approve' : 'reject');
    try {
      await rpc('admin_review_verification', { verification_id: id, approve, reason: approve ? undefined : reason });
      await qc.invalidateQueries({ queryKey: ['admin-queue'] });
      router.push('/admin');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  }

  const rows = [
    { label: 'Person', value: p?.full_name ?? '—' },
    { label: 'Email', value: p?.email ?? '—' },
    { label: 'Role', value: p?.role ?? '—' },
    ...(j ? [{ label: 'DOB (parent-attested)', value: formatUsDate(j.dob) || 'not yet' }, { label: 'DOB (teen entered)', value: formatUsDate(j.dob_claimed) }, { label: 'School', value: j.school_name }] : []),
    ...(e?.ubi ? [{ label: 'Legal name', value: e.legal_name ?? '—' }, { label: 'UBI', value: e.ubi }] : []),
    ...(details.name ? [{ label: 'Person checked', value: `${details.name} (${details.email})` }] : []),
  ];

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Review queue</Link>
      <PageHeader title={KIND_LABEL[v.kind] ?? v.kind} subtitle={`Submitted ${new Date(v.created_at).toLocaleString()}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <KeyValues rows={rows} />
          {doc ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
            <img src={doc} alt="Submitted document" className="w-full rounded-card border border-line bg-surface object-contain" />
          ) : null}
          {v.kind === 'business_registration' || v.kind === 'work_permit' ? (
            <Alert tone="info">Look up the UBI on the WA Department of Revenue business lookup and confirm the registration is active{v.kind === 'work_permit' ? ' and lists a Minor Work Permit endorsement' : ''}.</Alert>
          ) : null}
          {v.kind === 'proof_of_age' ? <Alert tone="info">Check the name matches and the date of birth agrees with the parent-attested DOB.</Alert> : null}
        </div>
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <Card className="space-y-4 p-6">
            <Textarea label="Reason (required to reject — the person sees it)" value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="e.g. The photo is too blurry to read" className="[&_textarea]:min-h-20" />
            {error ? <Alert tone="danger">{error}</Alert> : null}
            <Button block size="lg" loading={busy === 'approve'} onClick={() => decide(true)} data-testid="approve">{simulated ? 'Simulate: check clear' : 'Approve'}</Button>
            <Button block variant="danger" loading={busy === 'reject'} onClick={() => decide(false)} data-testid="reject">{simulated ? 'Simulate: check failed' : 'Reject'}</Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}
