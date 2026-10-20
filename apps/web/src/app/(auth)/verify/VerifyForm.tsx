'use client';
import { isSelfServeRole, otpSchema } from '@hmj/shared';
import { ArrowLeft, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { CodeInput } from '@/components/ui/CodeInput';
import { friendlyAuthError } from '@/lib/auth-errors';
import { getSupabase } from '@/lib/supabase/client';

const RESEND_SECONDS = 30;

export function VerifyForm() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get('email') ?? '';
  const role = params.get('role');
  const next = params.get('next');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function verify(value = code) {
    const parsed = otpSchema.safeParse(value);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Enter the 6-digit code');
    setError(null);
    setVerifying(true);
    const { error: authError } = await getSupabase().auth.verifyOtp({ email, token: parsed.data, type: 'email' });
    if (authError) {
      setVerifying(false);
      setCode('');
      return setError(friendlyAuthError(authError.message));
    }
    const target = next && next.startsWith('/') && !next.startsWith('//') ? next : `/home${role ? `?requested=${role}` : ''}`;
    router.replace(target);
    router.refresh();
  }

  async function resend() {
    setError(null);
    const { error: authError } = await getSupabase().auth.signInWithOtp({
      email,
      options: isSelfServeRole(role) ? { shouldCreateUser: true, data: { role } } : { shouldCreateUser: false },
    });
    if (authError) return setError(friendlyAuthError(authError.message));
    setInfo('A new code is on its way.');
    setCooldown(RESEND_SECONDS);
  }

  if (!email) {
    return <Alert tone="warning">Start from the <Link href="/sign-in/email" className="font-semibold underline">sign-in page</Link>.</Alert>;
  }

  return (
    <div className="animate-rise">
      <Link href={`/sign-in/email${role ? `?role=${role}` : ''}`} className="mb-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Use a different email
      </Link>
      <div className="mb-6 flex size-13 items-center justify-center rounded-tile bg-accent-soft text-accent-ink"><MailCheck className="size-6" /></div>
      <h1 className="text-[34px] leading-tight text-ink">Check your email</h1>
      <p className="mt-2 text-[15.5px] text-muted">
        We sent a 6-digit code to <span className="font-semibold text-ink">{email}</span>. It expires in 10 minutes.
      </p>
      <div className="mt-8 space-y-5">
        <CodeInput value={code} onChange={setCode} onComplete={verify} invalid={!!error} disabled={verifying} />
        {error ? <p role="alert" className="text-[13.5px] text-danger">{error}</p> : null}
        {info ? <p className="text-[13.5px] text-tint-3-ink">{info}</p> : null}
        <Button size="lg" block loading={verifying} onClick={() => verify()} data-testid="verify-code">Verify & continue</Button>
        <p className="text-center text-[14px] text-muted">
          Didn’t get it?{' '}
          <button type="button" onClick={resend} disabled={cooldown > 0} className="font-semibold text-accent-ink disabled:text-muted disabled:font-normal hover:underline disabled:no-underline">
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
        </p>
      </div>
    </div>
  );
}
