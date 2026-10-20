'use client';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CodeInput } from '@/components/ui/CodeInput';
import { Input } from '@/components/ui/Field';
import { useAuth } from '@/lib/auth';
import { callFunction } from '@/lib/functions';
import { invalidateSetup } from '@/lib/queries';
import { errorMessage } from '@/lib/rpc';

export default function VerifyPhone() {
  const { refreshProfile } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const [phoneNo, setPhoneNo] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'number' | 'code'>('number');
  const [mode, setMode] = useState<'live' | 'mock'>('live');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await callFunction<{ mode: 'live' | 'mock' }>('verify-phone', { action: 'start', phone: phoneNo });
      setMode(res.mode);
      setStep('code');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function check(value = code) {
    setError(null);
    setBusy(true);
    try {
      await callFunction('verify-phone', { action: 'check', code: value });
      await Promise.all([refreshProfile(), invalidateSetup(qc)]);
      router.push('/home');
    } catch (err) {
      setError(errorMessage(err));
      setCode('');
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/settings" className="mb-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Settings</Link>
      <Card className="p-7 sm:p-9">
        <div className="mb-5 flex size-12 items-center justify-center rounded-tile bg-tint-2 text-tint-2-ink"><MessageSquare className="size-6" /></div>
        {step === 'number' ? (
          <form onSubmit={send} className="space-y-5" noValidate>
            <div>
              <h1 className="text-[28px] text-ink">Verify your phone</h1>
              <p className="mt-1.5 text-[15px] text-muted">We’ll text you a 6-digit code. Your number is only shared once a job is confirmed.</p>
            </div>
            <Input label="Mobile number" type="tel" value={phoneNo} onChange={(e) => setPhoneNo(e.target.value)} placeholder="(425) 555-0123" autoComplete="tel" autoFocus error={error} data-testid="phone" />
            <Button type="submit" size="lg" block loading={busy} data-testid="send-sms">Text me a code</Button>
          </form>
        ) : (
          <div className="space-y-5">
            <div>
              <h1 className="text-[28px] text-ink">Enter the code</h1>
              <p className="mt-1.5 text-[15px] text-muted">We texted a code to {phoneNo}. <button className="font-semibold text-accent-ink hover:underline" onClick={() => setStep('number')}>Change number</button></p>
            </div>
            <CodeInput value={code} onChange={setCode} onComplete={check} invalid={!!error} disabled={busy} />
            {error ? <p role="alert" className="text-[13.5px] text-danger">{error}</p> : null}
            <Button size="lg" block loading={busy} onClick={() => check()} data-testid="check-sms">Verify</Button>
            {mode === 'mock' ? <Alert tone="info" title="Test mode">No real text is sent. The code is in the local inbox at localhost:8025, as “SMS to …”.</Alert> : null}
          </div>
        )}
      </Card>
    </div>
  );
}
