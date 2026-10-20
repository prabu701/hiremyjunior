'use client';
import { isSelfServeRole, ROLE_COPY, type SelfServeRole } from '@hmj/shared';
import { ArrowLeft, ArrowRight, Briefcase, MessageSquare, ShieldCheck, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { CodeInput } from '@/components/ui/CodeInput';
import { Input } from '@/components/ui/Field';
import { callFunction } from '@/lib/functions';
import { errorMessage } from '@/lib/rpc';
import { getSupabase } from '@/lib/supabase/client';

type Step = 'phone' | 'code' | 'role';
type Mode = 'live' | 'test' | 'mock';

const ROLES = [
  { role: 'junior', Icon: UserRound, tone: 'bg-tint-1 text-tint-1-ink', title: "I'm a teen", body: 'Find paid jobs near you. Ages 14–17.' },
  { role: 'parent', Icon: ShieldCheck, tone: 'bg-tint-2 text-tint-2-ink', title: "I'm a parent", body: 'Link your teen and approve their jobs.' },
  { role: 'employer', Icon: Briefcase, tone: 'bg-tint-3 text-tint-3-ink', title: "I'm hiring", body: 'For households and Washington businesses.' },
] as const;

function prettyPhone(input: string) {
  const d = input.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '').slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Phone number → 4-digit code → (new numbers) pick a role → signed in. */
export function PhoneSignIn({ invited = false }: { invited?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const roleParam = params.get('role');
  // Arriving from a parent's invite link (cookie read on the server): this is a teen signing up.
  const presetRole = isSelfServeRole(roleParam) ? roleParam : invited ? 'junior' : null;
  const next = params.get('next');

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('live');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function finish(session: { access_token: string; refresh_token: string }) {
    await getSupabase().auth.setSession(session);
    const target = next && next.startsWith('/') && !next.startsWith('//') ? next : `/home${presetRole ? `?requested=${presetRole}` : ''}`;
    router.replace(target);
    router.refresh();
  }

  async function send(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await callFunction<{ challenge_id: string; mode: Mode }>('phone-login', { action: 'start', phone });
      setChallenge(res.challenge_id);
      setMode(res.mode);
      setCode('');
      setStep('code');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(value = code, role: SelfServeRole | null = presetRole) {
    if (value.length !== 4 && step === 'code') return setError('Enter the 4-digit code.');
    setError(null);
    setBusy(true);
    try {
      const res = await callFunction<{ session?: { access_token: string; refresh_token: string }; needs_role?: boolean }>('phone-login', {
        action: 'verify', challenge_id: challenge, code: value, ...(role ? { role } : {}),
      });
      if (res.needs_role) {
        setStep('role');
        setBusy(false);
        return;
      }
      if (res.session) await finish(res.session);
    } catch (err) {
      setError(errorMessage(err));
      if (step === 'code') setCode('');
      setBusy(false);
    }
  }

  if (step === 'role') {
    return (
      <div className="animate-rise">
        <h1 className="text-[34px] leading-tight text-ink">Welcome! Who’s signing up?</h1>
        <p className="mt-2 text-[15.5px] text-muted">There’s no account for {prettyPhone(phone)} yet. Pick one to create it.</p>
        <div className="mt-8 space-y-3">
          {ROLES.map(({ role, Icon, tone, title, body }) => (
            <button
              key={role}
              type="button"
              disabled={busy}
              onClick={() => verify(code, role)}
              data-testid={`new-role-${role}`}
              className="group flex w-full items-center gap-4 rounded-card border border-line bg-surface p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift disabled:opacity-60"
            >
              <span className={`flex size-13 items-center justify-center rounded-tile ${tone}`}><Icon className="size-6" /></span>
              <span className="flex-1">
                <span className="block font-display text-[18px] font-semibold text-ink">{title}</span>
                <span className="block text-[14px] text-muted">{body}</span>
              </span>
              <ArrowRight className="size-5 text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
            </button>
          ))}
        </div>
        {error ? <Alert tone="danger" className="mt-5">{error}</Alert> : null}
      </div>
    );
  }

  if (step === 'code') {
    return (
      <div className="animate-rise">
        <button type="button" onClick={() => setStep('phone')} className="mb-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Use a different number
        </button>
        <div className="mb-6 flex size-13 items-center justify-center rounded-tile bg-accent-soft text-accent-ink"><MessageSquare className="size-6" /></div>
        <h1 className="text-[34px] leading-tight text-ink">Enter your code</h1>
        <p className="mt-2 text-[15.5px] text-muted">We texted a 4-digit code to <span className="font-semibold text-ink">{prettyPhone(phone)}</span>.</p>
        <div className="mt-8 space-y-5">
          <CodeInput length={4} value={code} onChange={setCode} onComplete={(v) => verify(v)} invalid={!!error} disabled={busy} />
          {error ? <p role="alert" className="text-[13.5px] text-danger">{error}</p> : null}
          <Button size="lg" block loading={busy} onClick={() => verify()} data-testid="verify-phone-code">Sign in</Button>
          {mode === 'test' ? (
            <Alert tone="info" title="Test mode">No text is sent. Use code <span className="font-bold tracking-widest">0000</span>.</Alert>
          ) : mode === 'mock' ? (
            <Alert tone="info" title="Test mode">The code is in the local inbox (localhost:8025) as “SMS to …”.</Alert>
          ) : (
            <p className="text-center text-[14px] text-muted">
              Didn’t get it? <button type="button" onClick={() => send()} className="font-semibold text-accent-ink hover:underline">Send a new code</button>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-rise">
      {presetRole ? (
        <Link href="/get-started" className="mb-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> {ROLE_COPY[presetRole].label} account
        </Link>
      ) : null}
      {invited ? (
        <Alert tone="success" className="mb-6" title="Your parent invited you">Sign up with your phone number and we’ll link your accounts.</Alert>
      ) : null}
      <h1 className="text-[34px] leading-tight text-ink">{presetRole ? 'What’s your phone number?' : 'Sign in'}</h1>
      <p className="mt-2 text-[15.5px] text-muted">
        {presetRole ? 'New here or coming back — we’ll text you a 4-digit code.' : 'Enter your mobile number and we’ll text you a 4-digit code. No password needed.'}
      </p>
      <form onSubmit={send} className="mt-8 space-y-5" noValidate>
        <Input
          label="Mobile number"
          type="tel"
          value={prettyPhone(phone)}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(425) 555-0123"
          autoComplete="tel"
          inputMode="tel"
          autoFocus
          error={error}
          data-testid="phone"
        />
        <Button type="submit" size="lg" block loading={busy} icon={<MessageSquare className="size-4.5" />} data-testid="send-phone-code">Text me a code</Button>
      </form>
      <div className="mt-8 space-y-2 text-center text-[14px] text-muted">
        {!presetRole ? (
          <p>New to HireMyJunior? <Link href="/get-started" className="font-semibold text-accent-ink hover:underline">Create an account</Link></p>
        ) : null}
        <p>
          <Link href={`/sign-in/email${presetRole ? `?role=${presetRole}` : ''}${next ? `${presetRole ? '&' : '?'}next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-accent-ink hover:underline">
            Use email instead
          </Link>
        </p>
      </div>
    </div>
  );
}
