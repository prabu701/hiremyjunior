'use client';
import { Check, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SetupChecklist } from '@/components/app/SetupChecklist';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KeyValues, PageHeader } from '@/components/ui/Misc';
import { useAuth } from '@/lib/auth';
import { phone } from '@/lib/format';

export default function Settings() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  if (!profile) return null;

  return (
    <div className="space-y-10">
      <PageHeader title="Settings" subtitle="Your profile, verification and account." />

      <Card className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <Avatar name={profile.full_name} size={64} />
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold text-ink">{profile.full_name ?? profile.email}</p>
          <p className="text-[14px] text-muted">{profile.email}{profile.phone ? ` · ${phone(profile.phone)}` : ''}</p>
          <div className="mt-2">{profile.status === 'active' ? <Badge tone="success" icon={<Check className="size-3.5" />}>Verified</Badge> : <Badge tone="warning">Setup in progress</Badge>}</div>
        </div>
        {profile.role !== 'admin' ? <ButtonLink href="/onboarding" variant="secondary" icon={<Pencil className="size-4" />}>Edit profile</ButtonLink> : null}
      </Card>

      {profile.role !== 'admin' ? <SetupChecklist title="Verification" always /> : null}

      <section className="space-y-4">
        <h2 className="text-lg text-ink">Account</h2>
        <KeyValues rows={[{ label: 'Email', value: profile.email ?? '—' }, { label: 'Account type', value: profile.role === 'junior' ? 'Teen' : profile.role[0]!.toUpperCase() + profile.role.slice(1) }]} />
        <Button variant="secondary" onClick={async () => { await signOut(); router.replace('/'); router.refresh(); }}>Sign out</Button>
      </section>
    </div>
  );
}
