'use client';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, FileCheck2, UserSearch } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { VerificationBadge } from '@/components/app/VerificationBadge';
import { Alert } from '@/components/ui/Alert';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KeyValues, PageHeader } from '@/components/ui/Misc';
import { useAuth } from '@/lib/auth';
import { callFunction } from '@/lib/functions';
import { invalidateSetup, useLatestVerification, useMyEmployer } from '@/lib/queries';
import { errorMessage, rpc } from '@/lib/rpc';

/** Background check (households: you; businesses: your supervisor) + business registration & permit. */
export default function EmployerVerification() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const employer = useMyEmployer().data;
  const business = employer?.kind === 'business';
  const identity = useLatestVerification('identity').latest;
  const check = useLatestVerification(business ? 'supervisor_check' : 'background_check').latest;
  const reg = useLatestVerification('business_registration').latest;
  const permit = useLatestVerification('work_permit').latest;
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; mode: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(name: string, fn: () => Promise<unknown>) {
    setError(null);
    setBusy(name);
    try {
      await fn();
      await invalidateSetup(qc);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const checkInFlight = check && ['processing', 'needs_review', 'verified'].includes(check.status);
  const businessSubmitted = !!reg && !!permit && [reg.status, permit.status].every((s) => s === 'needs_review' || s === 'verified');
  const subject = business ? employer?.supervisor_name ?? 'your supervisor' : profile?.full_name ?? 'you';
  const email = business ? employer?.supervisor_email : profile?.email;

  return (
    <div className="space-y-8">
      <Link href="/employer" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Home</Link>
      <PageHeader title="Verification" subtitle="Teens’ parents see that you’ve been checked. These are required before you can post." />
      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-5 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <span className="flex size-11 items-center justify-center rounded-tile bg-tint-2 text-tint-2-ink"><UserSearch className="size-5" /></span>
            <VerificationBadge status={check?.status} />
          </div>
          <div>
            <h2 className="text-xl text-ink">{business ? 'Supervisor background check' : 'Background check'}</h2>
            <p className="mt-1.5 text-[14.5px] text-muted">
              {business
                ? 'Teens report to your on-site supervisor, so they’re background-checked. Checkr emails them a secure link.'
                : 'Every household employer is checked before hiring someone’s teen. Checkr emails you a secure link — we never see your SSN.'}
            </p>
          </div>
          <KeyValues rows={[{ label: 'Person checked', value: subject }, { label: 'Invitation goes to', value: email ?? '—' }]} />
          {identity?.status !== 'verified' ? (
            <>
              <Alert tone="info">Verify your identity first.</Alert>
              <ButtonLink href="/settings/identity" variant="secondary" block>Verify identity</ButtonLink>
            </>
          ) : checkInFlight ? (
            <Alert tone={check?.status === 'verified' ? 'success' : 'info'}>
              {check?.status === 'verified' ? 'Background check passed.' : sent?.mode === 'mock' || check?.provider.startsWith('mock') ? `Test mode: the invitation went to ${email} in the local inbox. An admin completes the check from the review queue.` : 'Invitation sent. Results usually arrive within 24 hours.'}
            </Alert>
          ) : (
            <Button block size="lg" loading={busy === 'check'} onClick={() => act('check', async () => setSent(await callFunction<{ email: string; mode: string }>('background-check-start')))} data-testid="start-check">
              {check?.status === 'failed' ? 'Start again' : 'Send check invitation'}
            </Button>
          )}
        </Card>

        {business ? (
          <Card className="space-y-5 p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-11 items-center justify-center rounded-tile bg-tint-1 text-tint-1-ink"><Building2 className="size-5" /></span>
            </div>
            <div>
              <h2 className="text-xl text-ink">Washington business permits</h2>
              <p className="mt-1.5 text-[14.5px] text-muted">Before a teen’s first shift, Washington requires a Minor Work Permit Endorsement on your business license. We check it with the Department of Revenue.</p>
            </div>
            <KeyValues
              rows={[
                { label: 'Legal name', value: employer?.legal_name ?? '—' },
                { label: 'UBI', value: employer?.ubi ?? '—' },
                { label: 'Registration', value: <VerificationBadge status={reg?.status} /> },
                { label: 'Minor work permit', value: <VerificationBadge status={permit?.status} /> },
              ]}
            />
            {businessSubmitted ? (
              <Alert tone="info">Submitted — our team verifies within 1 business day.</Alert>
            ) : (
              <Button block size="lg" icon={<FileCheck2 className="size-4.5" />} loading={busy === 'business'} onClick={() => act('business', () => rpc('submit_business_verification'))} data-testid="submit-business">
                Submit for verification
              </Button>
            )}
          </Card>
        ) : null}
      </div>
    </div>
  );
}
