'use client';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Camera, IdCard, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { VerificationBadge } from '@/components/app/VerificationBadge';
import { Alert } from '@/components/ui/Alert';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';
import { callFunction } from '@/lib/functions';
import { invalidateSetup, useLatestVerification } from '@/lib/queries';
import { errorMessage } from '@/lib/rpc';

export default function VerifyIdentity() {
  const { profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const { latest } = useLatestVerification('identity');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const status = latest?.status;

  // While the ID flow is open in another tab, poll for the result.
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => qc.invalidateQueries({ queryKey: ['verifications'] }), 3000);
    return () => clearInterval(id);
  }, [waiting, qc]);

  useEffect(() => {
    if (status === 'verified' || status === 'failed') {
      invalidateSetup(qc);
      refreshProfile();
    }
  }, [status, qc, refreshProfile]);

  async function start() {
    setError(null);
    setBusy(true);
    try {
      const { url } = await callFunction<{ url: string }>('identity-start');
      setWaiting(true);
      window.open(url, '_blank', 'noopener');
      await qc.invalidateQueries({ queryKey: ['verifications'] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const why = profile?.role === 'employer' ? 'you’ll be hiring someone’s teen' : 'you approve jobs and vouch for your teen’s age';

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/settings" className="mb-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Settings</Link>
      <Card className="p-7 sm:p-9">
        <div className="flex items-start justify-between">
          <div className="mb-5 flex size-12 items-center justify-center rounded-tile bg-tint-3 text-tint-3-ink"><ShieldCheck className="size-6" /></div>
          <VerificationBadge status={status} />
        </div>
        <h1 className="text-[28px] text-ink">Verify it’s you</h1>
        <p className="mt-1.5 text-[15px] text-muted">Because {why}, we confirm your identity with a photo ID and a quick selfie.</p>
        <ul className="my-6 space-y-3">
          {[
            { Icon: IdCard, t: "A photo of your driver's license or passport" },
            { Icon: Camera, t: 'A selfie to match the ID photo' },
            { Icon: ShieldCheck, t: 'Handled by Stripe Identity — we never store your ID images' },
          ].map(({ Icon, t }) => (
            <li key={t} className="flex items-center gap-3 text-[14.5px] text-ink"><Icon className="size-5 text-tint-2-ink" />{t}</li>
          ))}
        </ul>
        {status === 'verified' ? (
          <div className="space-y-4">
            <Alert tone="success">You’re verified.</Alert>
            <ButtonLink href="/home" block size="lg">Continue</ButtonLink>
          </div>
        ) : (
          <div className="space-y-4">
            {waiting && status === 'pending' ? <Alert tone="info">Finish the steps in the tab that opened — this page updates automatically.</Alert> : null}
            {status === 'failed' ? <Alert tone="danger">That didn’t go through: {latest?.failure_reason ?? 'please try again'}.</Alert> : null}
            {error ? <Alert tone="danger">{error}</Alert> : null}
            <Button size="lg" block loading={busy} onClick={start} data-testid="start-identity">
              {status === 'failed' ? 'Try again' : status === 'pending' ? 'Continue verification' : 'Start ID verification'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
