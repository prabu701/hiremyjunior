'use client';
import type { Employer, EmployerKind, Junior, Parent } from '@hmj/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { DateInput } from '@/components/app/DateInput';
import { Logo } from '@/components/Logo';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Misc';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth';
import { formatUsDate, parseUsDate } from '@/lib/dates';
import { phone as formatPhone } from '@/lib/format';
import { readInviteCookie } from '@/lib/invite';
import { invalidateSetup, useMyEmployer, useMyJunior, useMyParent } from '@/lib/queries';
import { homeHref } from '@/lib/routes';
import { errorMessage, rpc } from '@/lib/rpc';

export default function Onboarding() {
  const { loading, session, profile } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !session) router.replace('/sign-in?next=/onboarding');
    if (profile?.role === 'admin') router.replace('/admin');
  }, [loading, session, profile, router]);

  if (loading || !profile) return <PageSpinner />;
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Logo href="/home" />
        {profile.onboarded_at ? <Button variant="ghost" size="sm" onClick={() => router.back()}>Cancel</Button> : null}
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-20">
        {profile.role === 'junior' ? <TeenForm /> : profile.role === 'parent' ? <ParentForm /> : profile.role === 'employer' ? <EmployerForm /> : null}
      </main>
    </div>
  );
}

function useSubmit() {
  const { profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstTime = !profile?.onboarded_at;
  async function submit(action: () => Promise<unknown>) {
    setError(null);
    setSaving(true);
    try {
      await action();
      await Promise.all([refreshProfile(), invalidateSetup(qc)]);
      if (!profile) return;
      // A teen who arrived through a parent's invite link goes straight on to linking.
      const next = !firstTime ? '/settings' : profile.role === 'junior' && readInviteCookie() ? '/teen/link-parent' : homeHref({ ...profile, onboarded_at: 'now' });
      router.replace(next);
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }
  return { submit, saving, error, firstTime };
}

function Shell({ step, title, subtitle, children, onSubmit, saving, error, firstTime, aside }: {
  step: string; title: string; subtitle: string; children: ReactNode; onSubmit: () => void; saving: boolean; error: string | null; firstTime: boolean; aside?: ReactNode;
}) {
  return (
    <form
      onSubmit={(e: FormEvent) => { e.preventDefault(); onSubmit(); }}
      className="animate-rise"
      noValidate
    >
      <p className="text-[13px] font-semibold text-accent">{firstTime ? step : 'Edit profile'}</p>
      <h1 className="mt-1 text-[34px] leading-tight text-ink">{title}</h1>
      <p className="mt-2 max-w-xl text-[15.5px] text-muted">{subtitle}</p>
      <Card className="mt-8 space-y-6 p-6 sm:p-8">
        {children}
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[13px] text-muted">{aside}</div>
          <Button type="submit" size="lg" loading={saving} data-testid="save-profile">{firstTime ? 'Continue' : 'Save changes'}</Button>
        </div>
      </Card>
    </form>
  );
}

/** Email for email sign-ups; the verified phone for phone sign-ups. Read-only either way. */
function ContactField() {
  const { profile } = useAuth();
  return profile?.email ? (
    <Input label="Email" value={profile.email} disabled />
  ) : (
    <Input label="Phone" value={formatPhone(profile?.phone)} disabled hint="Verified when you signed in" />
  );
}

function ZipCity({ zip, city, setZip, setCity }: { zip: string; city: string; setZip: (v: string) => void; setCity: (v: string) => void }) {
  return (
    <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
      <Input label="ZIP code" value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="98074" inputMode="numeric" data-testid="zip" />
      <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Sammamish" data-testid="city" />
    </div>
  );
}

function TeenForm() {
  const q = useMyJunior();
  return q.isLoading ? <PageSpinner /> : <TeenFields initial={q.data ?? null} />;
}
function ParentForm() {
  const q = useMyParent();
  return q.isLoading ? <PageSpinner /> : <ParentFields initial={q.data ?? null} />;
}
function EmployerForm() {
  const q = useMyEmployer();
  return q.isLoading ? <PageSpinner /> : <EmployerFields initial={q.data ?? null} />;
}

function TeenFields({ initial }: { initial: Junior | null }) {
  const { profile } = useAuth();
  const { submit, saving, error, firstTime } = useSubmit();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [dob, setDob] = useState(formatUsDate(initial?.dob ?? initial?.dob_claimed));
  const [school, setSchool] = useState(initial?.school_name ?? '');
  const [zip, setZip] = useState(initial?.zip ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [dobError, setDobError] = useState<string | null>(null);
  const locked = !!initial?.dob_attested_at;

  return (
    <Shell
      step="Step 1 of 2 · Teen sign-up"
      title="Tell us about you"
      subtitle="Next you’ll link your account to a parent or guardian. They confirm your date of birth and approve every job."
      firstTime={firstTime}
      saving={saving}
      error={error}
      aside="Only your first name, last initial and age range are ever shown to employers."
      onSubmit={() => {
        const iso = parseUsDate(dob);
        if (!iso) return setDobError('Enter your date of birth as MM/DD/YYYY');
        setDobError(null);
        submit(() => rpc('save_junior_profile', { full_name: name, dob: iso, school_name: school, zip, city }));
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maya Rodriguez" autoComplete="name" data-testid="full-name" />
        <ContactField />
        <DateInput label="Date of birth" value={dob} onChange={setDob} error={dobError} disabled={locked} hint={locked ? 'Confirmed by your parent' : 'You must be 14–17'} testId="dob" />
        <Input label="School" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Skyline High School" data-testid="school" />
      </div>
      <ZipCity zip={zip} city={city} setZip={setZip} setCity={setCity} />
    </Shell>
  );
}

function ParentFields({ initial }: { initial: Parent | null }) {
  const { profile } = useAuth();
  const { submit, saving, error, firstTime } = useSubmit();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [zip, setZip] = useState(initial?.zip ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  return (
    <Shell
      step="Parent sign-up"
      title="Set up your parent account"
      subtitle={profile?.phone_verified_at ? 'Next you’ll verify your identity, then invite your teen.' : 'Next you’ll verify your phone and identity, then invite your teen.'}
      firstTime={firstTime}
      saving={saving}
      error={error}
      aside="Your verified identity is what vouches for your teen’s age."
      onSubmit={() => submit(() => rpc('save_parent_profile', { full_name: name, zip, city }))}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Rodriguez" autoComplete="name" data-testid="full-name" />
        <ContactField />
      </div>
      <ZipCity zip={zip} city={city} setZip={setZip} setCity={setCity} />
    </Shell>
  );
}

function EmployerFields({ initial }: { initial: Employer | null }) {
  const { profile } = useAuth();
  const { submit, saving, error, firstTime } = useSubmit();
  const [kind, setKind] = useState<EmployerKind | null>(initial?.kind ?? null);
  const [name, setName] = useState(profile?.full_name ?? '');
  const [displayName, setDisplayName] = useState(initial?.display_name ?? '');
  const [zip, setZip] = useState(initial?.zip ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [legalName, setLegalName] = useState(initial?.legal_name ?? '');
  const [ubi, setUbi] = useState(initial?.ubi ?? '');
  const [supervisorName, setSupervisorName] = useState(initial?.supervisor_name ?? '');
  const [supervisorEmail, setSupervisorEmail] = useState(initial?.supervisor_email ?? '');
  const [kindError, setKindError] = useState<string | null>(null);

  return (
    <Shell
      step="Employer sign-up"
      title="Set up your employer account"
      subtitle="Tell us who’s hiring. Households and businesses are verified differently."
      firstTime={firstTime}
      saving={saving}
      error={error ?? kindError}
      aside={kind === 'business' ? 'Businesses hire and pay teens directly — HireMyJunior makes the introduction.' : 'Every household employer is background-checked before posting.'}
      onSubmit={() => {
        if (!kind) return setKindError('Choose household or business.');
        setKindError(null);
        submit(() => rpc('save_employer_profile', {
          full_name: name, kind, display_name: displayName, zip, city,
          legal_name: legalName, ubi, supervisor_name: supervisorName, supervisor_email: supervisorEmail,
        }));
      }}
    >
      <div>
        <p className="mb-3 text-[13px] font-semibold text-ink/80">Who’s hiring?</p>
        {initial ? (
          <p className="text-[15px] font-semibold text-ink">{kind === 'business' ? 'A registered business' : 'A household'} <span className="font-normal text-muted">— can’t be changed</span></p>
        ) : (
          <Segmented
            label="Who's hiring"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'household', label: 'A household', hint: 'Help at home: yard work, pets, babysitting, tutoring', icon: <Home className="size-5" /> },
              { value: 'business', label: 'A business', hint: 'A registered Washington business hiring for a regular job', icon: <Building2 className="size-5" /> },
            ]}
          />
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Your full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Wei Chen" autoComplete="name" data-testid="full-name" />
        <Input label="Name teens will see" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={kind === 'business' ? 'Sammamish Pet Supply' : 'The Chen Family'} data-testid="display-name" />
      </div>
      <ZipCity zip={zip} city={city} setZip={setZip} setCity={setCity} />
      {kind === 'business' ? (
        <div className="grid gap-5 rounded-card bg-surface-2 p-5 sm:grid-cols-2">
          <Input label="Business legal name" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Sammamish Pet Supply LLC" data-testid="legal-name" />
          <Input label="WA UBI number" value={ubi} onChange={(e) => setUbi(e.target.value)} placeholder="603 123 456" inputMode="numeric" data-testid="ubi" />
          <Input label="On-site supervisor" value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} placeholder="Jordan Lee" data-testid="supervisor-name" />
          <Input label="Supervisor’s email" type="email" value={supervisorEmail} onChange={(e) => setSupervisorEmail(e.target.value)} placeholder="jordan@petsupply.com" data-testid="supervisor-email" />
        </div>
      ) : null}
    </Shell>
  );
}
