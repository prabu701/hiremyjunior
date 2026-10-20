'use client';
import { emailSchema, isSelfServeRole, ROLE_COPY } from '@hmj/shared';
import { ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { friendlyAuthError } from '@/lib/auth-errors';
import { getSupabase } from '@/lib/supabase/client';

const ROLE_NOTE = {
  junior: "After you sign in, you'll link your account to a parent or guardian — they approve every job.",
  parent: "You'll verify your identity, then link your teen with an invite code.",
  employer: 'Every employer is identity- and background-checked before posting jobs.',
} as const;

export function EmailSignInForm() {
  const params = useSearchParams();
  const router = useRouter();
  const roleParam = params.get('role');
  const role = isSelfServeRole(roleParam) ? roleParam : null;
  const isAdmin = roleParam === 'admin';
  const next = params.get('next') ?? '';
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? 'Enter a valid email address');
    setError(null);
    setSending(true);
    // A role means "new or returning"; no role means returning only (never create a role-less account).
    const { error: authError } = await getSupabase().auth.signInWithOtp({
      email: parsed.data,
      options: role ? { shouldCreateUser: true, data: { role } } : { shouldCreateUser: false },
    });
    setSending(false);
    if (authError) return setError(friendlyAuthError(authError.message, !role && !isAdmin));
    const q = new URLSearchParams({ email: parsed.data });
    if (role) q.set('role', role);
    if (next) q.set('next', next);
    router.push(`/verify?${q}`);
  }

  return (
    <div className="animate-rise">
      {role ? (
        <Link href="/get-started" className="mb-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> {ROLE_COPY[role].label} account
        </Link>
      ) : null}
      <h1 className="text-[34px] leading-tight text-ink">{role ? "What's your email?" : isAdmin ? 'Ops sign in' : 'Welcome back'}</h1>
      <p className="mt-2 text-[15.5px] text-muted">
        {role ? 'New here or coming back — either way we’ll email you a 6-digit code. No password needed.' : 'We’ll email you a 6-digit code to sign in. No password needed.'}
      </p>
      <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
        <Input label="Email" type="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoFocus error={error} data-testid="email" />
        <Button type="submit" size="lg" block loading={sending} icon={<Mail className="size-4.5" />} data-testid="send-code">Email me a code</Button>
      </form>
      {role ? <Alert tone="safety" className="mt-6">{ROLE_NOTE[role]}</Alert> : null}
      {!isAdmin ? (
        <p className="mt-8 text-center text-[14px] text-muted">
          <Link href={`/sign-in${role ? `?role=${role}` : ''}`} className="font-semibold text-accent-ink hover:underline">Use your phone number instead</Link>
        </p>
      ) : null}
    </div>
  );
}
