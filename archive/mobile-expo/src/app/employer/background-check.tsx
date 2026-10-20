import { Button, InfoRows, Notice, Screen, Text } from '@hmj/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { VerificationBadge } from '@/components/VerificationBadge';
import { useAuth } from '@/lib/auth';
import { callFunction } from '@/lib/functions';
import { invalidateSetup, useLatestVerification, useMyEmployer } from '@/lib/queries';
import { errorMessage } from '@/lib/rpc';

export default function BackgroundCheck() {
  const { profile } = useAuth();
  const employer = useMyEmployer().data;
  const business = employer?.kind === 'business';
  const { latest } = useLatestVerification(business ? 'supervisor_check' : 'background_check');
  const identity = useLatestVerification('identity').latest;
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<{ email: string; mode: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const status = latest?.status;
  const inFlight = status === 'processing' || status === 'needs_review' || status === 'verified';
  const done = () => (router.canGoBack() ? router.back() : router.replace('/employer'));

  async function start() {
    setError(null);
    setBusy(true);
    try {
      const res = await callFunction<{ email: string; mode: string }>('background-check-start');
      setSentTo(res);
      await invalidateSetup();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const subject = business ? employer?.supervisor_name ?? 'your supervisor' : profile?.full_name ?? 'you';
  const email = business ? employer?.supervisor_email : profile?.email;

  return (
    <Screen
      onBack={done}
      headerLabel="Background check"
      footer={inFlight ? <Button label="Done" onPress={done} /> : <Button testID="start-check" label={status === 'failed' ? 'Start again' : 'Send check invitation'} onPress={start} loading={busy} disabled={identity?.status !== 'verified'} />}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="title" accessibilityRole="header">{business ? 'Check your supervisor' : 'Background check'}</Text>
        <VerificationBadge status={status} />
      </View>
      <Text muted>
        {business
          ? 'Teens report to your on-site supervisor, so they need a background check. Checkr e-mails them a secure link to enter their details.'
          : 'Every household employer is background-checked before hiring someone’s teen. Checkr e-mails you a secure link to enter your details — HireMyJunior never sees your SSN.'}
      </Text>
      <InfoRows rows={[{ label: 'Person checked', value: subject }, { label: 'Invitation goes to', value: email ?? '—' }, { label: 'Provider', value: 'Checkr' }]} />
      {identity?.status !== 'verified' ? <Notice icon="info">Verify your identity first.</Notice> : null}
      {status === 'processing' || sentTo ? (
        <Notice tone={2} icon="clock">
          {sentTo?.mode === 'mock'
            ? `Test mode: an invitation e-mail went to ${sentTo.email} in Mailpit. An admin completes the check from the review queue.`
            : 'Invitation sent. Results usually arrive within 24 hours.'}
        </Notice>
      ) : null}
      {status === 'needs_review' ? <Notice tone={2}>The report is being reviewed by our team. We'll be in touch.</Notice> : null}
      {status === 'verified' ? <Notice tone={3} icon="check">Background check passed.</Notice> : null}
      {status === 'failed' ? <Notice icon="alert">{`The check didn't pass${latest?.failure_reason ? `: ${latest.failure_reason}` : ''}.`}</Notice> : null}
      {error ? <Notice icon="alert">{error}</Notice> : null}
    </Screen>
  );
}
