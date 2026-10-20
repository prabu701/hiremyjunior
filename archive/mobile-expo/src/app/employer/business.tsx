import { Button, Card, InfoRows, Notice, Screen, Text } from '@hmj/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { VerificationBadge } from '@/components/VerificationBadge';
import { invalidateSetup, useLatestVerification, useMyEmployer } from '@/lib/queries';
import { errorMessage, rpc } from '@/lib/rpc';

/** Track B: WA business registration + Minor Work Permit Endorsement, verified manually by HMJ. */
export default function BusinessVerification() {
  const employer = useMyEmployer().data;
  const reg = useLatestVerification('business_registration').latest;
  const permit = useLatestVerification('work_permit').latest;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submitted = !!reg && !!permit && [reg.status, permit.status].every((s) => s === 'needs_review' || s === 'verified');
  const done = () => (router.canGoBack() ? router.back() : router.replace('/employer'));

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await rpc('submit_business_verification');
      await invalidateSetup();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      onBack={done}
      headerLabel="Business verification"
      footer={submitted ? <Button label="Done" onPress={done} /> : <Button testID="submit-business" label="Submit for verification" onPress={submit} loading={busy} />}
    >
      <Text variant="title" accessibilityRole="header">Hiring minors in Washington</Text>
      <Text muted>
        Before a teen's first shift, WA requires a Minor Work Permit Endorsement on your business license. We check your registration and endorsement with the Department of Revenue before you can post.
      </Text>
      <InfoRows rows={[{ label: 'Legal name', value: employer?.legal_name ?? '—' }, { label: 'UBI', value: employer?.ubi ?? '—' }]} />
      <Card padding={16} style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 14 }}>Business registration</Text>
          <VerificationBadge status={reg?.status} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 14 }}>Minor Work Permit Endorsement</Text>
          <VerificationBadge status={permit?.status} />
        </View>
      </Card>
      {[reg, permit].some((v) => v?.status === 'failed') ? (
        <Notice icon="alert">{[reg, permit].find((v) => v?.status === 'failed')?.failure_reason ?? 'A check did not pass.'}</Notice>
      ) : null}
      {submitted ? <Notice tone={2} icon="clock">Submitted — our team verifies within 1 business day.</Notice> : null}
      <Notice tone={2}>Wrong details? Edit your profile first, then submit.</Notice>
      {error ? <Notice icon="alert">{error}</Notice> : null}
    </Screen>
  );
}
