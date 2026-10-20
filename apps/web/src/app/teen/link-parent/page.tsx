'use client';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { useState, type FormEvent } from 'react';
import { GuardianList } from '@/components/app/GuardianList';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { SectionTitle } from '@/components/ui/Misc';
import { clearInviteCookie, readInviteCookie } from '@/lib/invite';
import { invalidateSetup } from '@/lib/queries';
import { errorMessage, rpc } from '@/lib/rpc';

export default function LinkParent() {
  const qc = useQueryClient();
  const params = useSearchParams();
  // From a parent's invite link (?code=… or the cookie it set): pre-fill and link automatically.
  const fromUrl = (params.get('code') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const [code, setCode] = useState(fromUrl);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(value: string) {
    setError(null);
    setBusy(true);
    try {
      const id = await rpc('link_guardian', { code: value });
      if (!id) setError("That code isn't valid or has expired. Ask your parent for a new one.");
      else {
        setDone(true);
        setCode('');
        await invalidateSetup(qc);
      }
      clearInviteCookie();
    } catch (err) {
      setError(errorMessage(err));
      clearInviteCookie();
    } finally {
      setBusy(false);
    }
  }

  function link(e: FormEvent) {
    e.preventDefault();
    submit(code);
  }

  const autoTried = useRef(false);
  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;
    const invite = fromUrl || readInviteCookie();
    // Deferred a tick so the effect itself doesn't set state synchronously.
    if (invite?.length === 8) queueMicrotask(() => void submit(invite));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for the invite link
  }, []);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <Link href="/teen/profile" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> Profile</Link>
      <Card className="p-7 sm:p-9">
        <div className="mb-5 flex size-12 items-center justify-center rounded-tile bg-accent-soft text-accent-ink"><KeyRound className="size-6" /></div>
        <h1 className="text-[28px] text-ink">Link your parent</h1>
        <p className="mt-1.5 text-[15px] text-muted">Ask your parent or guardian to sign up as a Parent. Their dashboard gives them an 8-character invite code — enter it here.</p>
        <form onSubmit={link} className="mt-6 space-y-4" noValidate>
          <Input label="Invite code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 9))} placeholder="ABCD-2345" autoComplete="off" error={error} className="[&_input]:font-display [&_input]:text-[22px] [&_input]:tracking-[0.25em]" data-testid="invite-code" />
          <Button type="submit" size="lg" block loading={busy} disabled={code.replace(/[^A-Z0-9]/g, '').length < 8} data-testid="link-submit">Link account</Button>
        </form>
        {done ? <Alert tone="success" className="mt-5" title="Request sent!">Your parent confirms your date of birth to finish linking — then you’re one step from applying.</Alert> : null}
      </Card>
      <section className="space-y-4">
        <SectionTitle>Linked so far</SectionTitle>
        <GuardianList empty={<p className="text-[14px] text-muted">Nobody yet.</p>} />
      </section>
    </div>
  );
}
