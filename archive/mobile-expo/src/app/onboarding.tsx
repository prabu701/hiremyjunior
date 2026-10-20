import type { Employer, EmployerKind, Junior, Parent } from '@hmj/shared';
import { Button, Notice, Screen, Segmented, Text, TextField, useTheme } from '@hmj/ui';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DateField, formatUsDate, parseUsDate } from '@/components/DateField';
import { useAuth } from '@/lib/auth';
import { invalidateSetup, useMyEmployer, useMyJunior, useMyParent } from '@/lib/queries';
import { homeHref } from '@/lib/routes';
import { errorMessage, rpc } from '@/lib/rpc';

/** Role-specific profile form. Also used to edit the profile later (fields prefill). */
export default function Onboarding() {
  const { loading, session, profile } = useAuth();
  const { t } = useTheme();
  if (loading || (session && !profile)) return <View style={{ flex: 1, backgroundColor: t.bg }}><ActivityIndicator color={t.accent} /></View>;
  if (!session || !profile) return <Redirect href="/welcome" />;
  if (profile.role === 'junior') return <TeenForm />;
  if (profile.role === 'parent') return <ParentForm />;
  if (profile.role === 'employer') return <EmployerForm />;
  return <Redirect href={homeHref(profile)} />;
}

function useSubmit() {
  const { profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstTime = !profile?.onboarded_at;

  async function submit(action: () => Promise<unknown>) {
    setError(null);
    setSaving(true);
    try {
      await action();
      await Promise.all([refreshProfile(), invalidateSetup()]);
      if (firstTime && profile) router.replace(homeHref({ ...profile, onboarded_at: new Date().toISOString() }));
      else router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  return { submit, saving, error, firstTime };
}

function Loading() {
  const { t } = useTheme();
  return <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center' }}><ActivityIndicator color={t.accent} /></View>;
}

// Each form mounts only once its existing record has loaded, so fields can start from it
// (no copy-into-state effects).
function TeenForm() {
  const q = useMyJunior();
  return q.isLoading ? <Loading /> : <TeenFields initial={q.data ?? null} />;
}
function ParentForm() {
  const q = useMyParent();
  return q.isLoading ? <Loading /> : <ParentFields initial={q.data ?? null} />;
}
function EmployerForm() {
  const q = useMyEmployer();
  return q.isLoading ? <Loading /> : <EmployerFields initial={q.data ?? null} />;
}

function back() {
  if (router.canGoBack()) router.back();
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
    <Screen
      onBack={firstTime ? undefined : back}
      headerLabel={firstTime ? 'Teen sign-up' : 'Edit profile'}
      footer={
        <Button
          testID="save-profile"
          label={firstTime ? 'Continue' : 'Save'}
          loading={saving}
          onPress={() => {
            const iso = parseUsDate(dob);
            if (!iso) return setDobError('Enter your date of birth as MM/DD/YYYY');
            setDobError(null);
            submit(() => rpc('save_junior_profile', { full_name: name, dob: iso, school_name: school, zip, city }));
          }}
        />
      }
    >
      <Text variant="title" accessibilityRole="header">Tell us about you</Text>
      <View style={{ gap: 16 }}>
        <TextField testID="full-name" label="Full name" value={name} onChangeText={setName} placeholder="Maya Rodriguez" autoComplete="name" />
        <TextField label="Email" value={profile?.email ?? ''} editable={false} />
        <DateField testID="dob" label="Date of birth" value={dob} onChange={setDob} error={dobError} editable={!locked} />
        <TextField testID="school" label="School" value={school} onChangeText={setSchool} placeholder="Skyline High School" />
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <TextField testID="zip" label="ZIP code" value={zip} onChangeText={(v) => setZip(v.replace(/\D/g, '').slice(0, 5))} placeholder="98074" keyboardType="number-pad" />
          </View>
          <View style={{ flex: 2 }}>
            <TextField testID="city" label="City" value={city} onChangeText={setCity} placeholder="Sammamish" />
          </View>
        </View>
      </View>
      {error ? <Notice icon="alert">{error}</Notice> : null}
      <Notice>
        {locked
          ? 'Your parent confirmed your date of birth, so it can’t be changed here.'
          : 'Next you’ll link your account to a parent or guardian. They confirm your date of birth and approve every job.'}
      </Notice>
    </Screen>
  );
}

function ParentFields({ initial }: { initial: Parent | null }) {
  const { profile } = useAuth();
  const { submit, saving, error, firstTime } = useSubmit();
  const [name, setName] = useState(profile?.full_name ?? '');
  const [zip, setZip] = useState(initial?.zip ?? '');
  const [city, setCity] = useState(initial?.city ?? '');

  return (
    <Screen
      onBack={firstTime ? undefined : back}
      headerLabel={firstTime ? 'Parent sign-up' : 'Edit profile'}
      footer={<Button testID="save-profile" label={firstTime ? 'Continue' : 'Save'} loading={saving} onPress={() => submit(() => rpc('save_parent_profile', { full_name: name, zip, city }))} />}
    >
      <Text variant="title" accessibilityRole="header">Set up your parent account</Text>
      <View style={{ gap: 16 }}>
        <TextField testID="full-name" label="Full name" value={name} onChangeText={setName} placeholder="Priya Rodriguez" autoComplete="name" />
        <TextField label="Email" value={profile?.email ?? ''} editable={false} />
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <TextField testID="zip" label="ZIP code" value={zip} onChangeText={(v) => setZip(v.replace(/\D/g, '').slice(0, 5))} placeholder="98074" keyboardType="number-pad" />
          </View>
          <View style={{ flex: 2 }}>
            <TextField testID="city" label="City" value={city} onChangeText={setCity} placeholder="Sammamish" />
          </View>
        </View>
      </View>
      {error ? <Notice icon="alert">{error}</Notice> : null}
      <Notice tone={2} icon="shield">Next you’ll verify your identity and get an invite code to link your teen’s account.</Notice>
    </Screen>
  );
}

function EmployerFields({ initial }: { initial: Employer | null }) {
  const { profile } = useAuth();
  const { t } = useTheme();
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

  const kindLocked = !!initial;

  return (
    <Screen
      onBack={firstTime ? undefined : back}
      headerLabel={firstTime ? 'Employer sign-up' : 'Edit profile'}
      footer={
        <Button
          testID="save-profile"
          label={firstTime ? 'Continue' : 'Save'}
          loading={saving}
          onPress={() => {
            if (!kind) return setKindError('Choose household or business.');
            setKindError(null);
            submit(() =>
              rpc('save_employer_profile', {
                full_name: name, kind, display_name: displayName, zip, city,
                legal_name: legalName, ubi, supervisor_name: supervisorName, supervisor_email: supervisorEmail,
              }),
            );
          }}
        />
      }
    >
      <Text variant="title" accessibilityRole="header">Set up your employer account</Text>
      <View style={{ gap: 10 }}>
        <Text variant="label">Who's hiring?</Text>
        {kindLocked ? (
          <Text>{kind === 'business' ? 'A registered business' : 'A household'}</Text>
        ) : (
          <Segmented
            testIDPrefix="kind"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'household', label: 'Household', hint: 'Help at home: yard work, pets, babysitting, tutoring' },
              { value: 'business', label: 'Business', hint: 'A registered WA business hiring for a regular job' },
            ]}
          />
        )}
        {kindError ? <Text variant="caption" color={t.danger}>{kindError}</Text> : null}
      </View>

      <View style={{ gap: 16 }}>
        <TextField testID="full-name" label="Your full name" value={name} onChangeText={setName} placeholder="Wei Chen" autoComplete="name" />
        <TextField
          testID="display-name"
          label="Name teens will see"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={kind === 'business' ? 'Sammamish Pet Supply' : 'The Chen Family'}
        />
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1 }}>
            <TextField testID="zip" label="ZIP code" value={zip} onChangeText={(v) => setZip(v.replace(/\D/g, '').slice(0, 5))} placeholder="98074" keyboardType="number-pad" />
          </View>
          <View style={{ flex: 2 }}>
            <TextField testID="city" label="City" value={city} onChangeText={setCity} placeholder="Sammamish" />
          </View>
        </View>
        {kind === 'business' ? (
          <>
            <TextField testID="legal-name" label="Business legal name" value={legalName} onChangeText={setLegalName} placeholder="Sammamish Pet Supply LLC" />
            <TextField testID="ubi" label="WA UBI number" value={ubi} onChangeText={setUbi} placeholder="603 123 456" keyboardType="number-pad" />
            <TextField testID="supervisor-name" label="On-site supervisor" value={supervisorName} onChangeText={setSupervisorName} placeholder="Jordan Lee" />
            <TextField testID="supervisor-email" label="Supervisor's email" value={supervisorEmail} onChangeText={setSupervisorEmail} placeholder="jordan@petsupply.com" keyboardType="email-address" autoCapitalize="none" />
          </>
        ) : null}
      </View>
      {error ? <Notice icon="alert">{error}</Notice> : null}
      <Notice tone={3} icon="shield">
        {kind === 'business'
          ? 'Businesses need a Minor Work Permit Endorsement on their WA license. We verify it, and background-check your supervisor, before you can post. HireMyJunior introduces you to teens — you hire and pay them directly.'
          : 'We run a background check on every employer before you can post jobs — usually ready within 24 hours.'}
      </Notice>
    </Screen>
  );
}
