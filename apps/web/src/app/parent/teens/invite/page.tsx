'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Copy, KeyRound, Link2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';
import { errorMessage, rpc, unwrap } from '@/lib/rpc';
import { getSupabase } from '@/lib/supabase/client';

const pretty = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

export default function InviteTeen() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const invites = useQuery({
    queryKey: ['invites', session?.user.id],
    enabled: !!session,
    queryFn: async () =>
      unwrap(await getSupabase().from('guardian_invites').select('*').is('redeemed_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false })),
  });
  const latest = invites.data?.[0];

  async function create() {
    setError(null);
    setBusy(true);
    try {
      await rpc('create_guardian_invite');
      await qc.invalidateQueries({ queryKey: ['invites'] });
      setCopied(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/parent/teens" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-muted hover:text-ink"><ArrowLeft className="size-4" /> My teens</Link>
      <Card className="p-7 sm:p-9">
        <div className="mb-5 flex size-12 items-center justify-center rounded-tile bg-accent-soft text-accent-ink"><KeyRound className="size-6" /></div>
        <h1 className="text-[28px] text-ink">Link your teen’s account</h1>
        <ol className="mt-4 space-y-2 text-[15px] text-muted">
          <li><span className="font-semibold text-ink">1.</span> Send your teen the invite link (or read them the code).</li>
          <li><span className="font-semibold text-ink">2.</span> They sign up with their phone number — the link connects them to you.</li>
          <li><span className="font-semibold text-ink">3.</span> You confirm their date of birth under My teens to finish.</li>
        </ol>

        {latest ? (
          <div className="mt-7 rounded-card border border-line bg-surface-2 p-6 text-center">
            <p className="text-[13px] font-semibold text-muted">Invite code · expires {new Date(latest.expires_at).toLocaleDateString()}</p>
            <p className="mt-2 font-display text-[44px] font-semibold tracking-[0.12em] text-ink" data-testid="invite-code-value">{pretty(latest.code)}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                size="sm"
                icon={copied === 'link' ? <Check className="size-4" /> : <Link2 className="size-4" />}
                onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/join/${latest.code}`); setCopied('link'); }}
                data-testid="copy-invite-link"
              >
                {copied === 'link' ? 'Link copied' : 'Copy invite link'}
              </Button>
              <Button
                variant="soft"
                size="sm"
                icon={copied === 'code' ? <Check className="size-4" /> : <Copy className="size-4" />}
                onClick={async () => { await navigator.clipboard.writeText(latest.code); setCopied('code'); }}
              >
                {copied === 'code' ? 'Copied' : 'Copy code'}
              </Button>
            </div>
            <p className="mt-3 break-all text-[12.5px] text-muted" data-testid="invite-link">{typeof window !== 'undefined' ? `${window.location.origin}/join/${latest.code}` : ''}</p>
          </div>
        ) : null}

        {error ? <Alert tone="danger" className="mt-5">{error}</Alert> : null}
        <Button size="lg" block className="mt-6" variant={latest ? 'secondary' : 'primary'} loading={busy} onClick={create} data-testid="new-invite">
          {latest ? 'Get another code' : 'Get invite code'}
        </Button>
        <p className="mt-4 text-center text-[13px] text-muted">Each code works once and expires after 7 days.</p>
      </Card>
    </div>
  );
}
