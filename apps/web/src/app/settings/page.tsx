'use client';
import { Check, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SetupChecklist } from '@/components/app/SetupChecklist';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { KeyValues, PageHeader } from '@/components/ui/Misc';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/cn';
import { phone } from '@/lib/format';
import { applyAppearance, THEMES, type CornerStyle, type ThemeKey } from '@/lib/theme';

export default function Settings() {
  const { profile, updateProfile, signOut } = useAuth();
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeKey>((profile?.theme as ThemeKey) ?? 'citrus');
  const [corners, setCorners] = useState<CornerStyle>((profile?.corner_style as CornerStyle) ?? 'rounded');
  if (!profile) return null;

  function choose(next: { theme?: ThemeKey; corners?: CornerStyle }) {
    const t = next.theme ?? theme;
    const c = next.corners ?? corners;
    setTheme(t);
    setCorners(c);
    applyAppearance(t, c);
    updateProfile({ theme: t, corner_style: c }).catch(() => {});
  }

  return (
    <div className="space-y-10">
      <PageHeader title="Settings" subtitle="Your profile, verification and how HireMyJunior looks." />

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
        <div>
          <h2 className="text-lg text-ink">Appearance</h2>
          <p className="text-[14px] text-muted">Pick a look. It follows you to every device you sign in on.</p>
        </div>
        <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {THEMES.map((t) => {
            const on = t.key === theme;
            return (
              <button
                key={t.key}
                role="radio"
                aria-checked={on}
                data-testid={`theme-${t.key}`}
                onClick={() => choose({ theme: t.key })}
                className={cn('overflow-hidden rounded-card border-2 bg-surface text-left transition-all', on ? 'border-accent shadow-[0_0_0_4px_var(--accent-soft)]' : 'border-line hover:border-line-strong')}
              >
                <div className="flex h-20 items-end gap-2 p-3" style={{ background: t.bg }}>
                  <span className="h-8 w-14 rounded-lg" style={{ background: t.accent }} />
                  <span className="h-5 w-10 rounded-md opacity-60" style={{ background: t.accent }} />
                </div>
                <div className="flex items-center justify-between p-3.5">
                  <span>
                    <span className="block text-[14px] font-semibold text-ink">{t.name}</span>
                    <span className="block text-[12.5px] text-muted">{t.desc}</span>
                  </span>
                  {on ? <Check className="size-5 text-accent" /> : null}
                </div>
              </button>
            );
          })}
        </div>
        <div role="radiogroup" aria-label="Corner style" className="flex gap-3">
          {(['rounded', 'sharp'] as const).map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={corners === c}
              data-testid={`corners-${c}`}
              onClick={() => choose({ corners: c })}
              className={cn('flex items-center gap-3 rounded-control border-2 bg-surface px-4 py-3 text-[14px] font-semibold text-ink', corners === c ? 'border-accent' : 'border-line')}
            >
              <span className="h-5 w-9 bg-accent" style={{ borderRadius: c === 'rounded' ? 999 : 0 }} />
              {c === 'rounded' ? 'Rounded corners' : 'Sharp corners'}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg text-ink">Account</h2>
        <KeyValues rows={[{ label: 'Email', value: profile.email ?? '—' }, { label: 'Account type', value: profile.role === 'junior' ? 'Teen' : profile.role[0]!.toUpperCase() + profile.role.slice(1) }]} />
        <Button variant="secondary" onClick={async () => { await signOut(); router.replace('/'); router.refresh(); }}>Sign out</Button>
      </section>
    </div>
  );
}
