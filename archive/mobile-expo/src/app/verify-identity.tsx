import { Button, Icon, Notice, Screen, Text, useTheme } from '@hmj/ui';
import { Redirect, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { VerificationBadge } from '@/components/VerificationBadge';
import { useAuth } from '@/lib/auth';
import { callFunction } from '@/lib/functions';
import { invalidateSetup, queryClient, useLatestVerification } from '@/lib/queries';
import { errorMessage } from '@/lib/rpc';

/** Government ID + selfie via Stripe Identity (or the local simulator). */
export default function VerifyIdentity() {
  const { session, profile, refreshProfile } = useAuth();
  const { t } = useTheme();
  const { latest } = useLatestVerification('identity');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);

  // While the person is in the ID flow (another tab/sheet), poll for the result.
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => queryClient.invalidateQueries({ queryKey: ['verifications'] }), 3000);
    return () => clearInterval(id);
  }, [waiting]);

  const status = latest?.status;
  useEffect(() => {
    if (status === 'verified' || status === 'failed') {
      invalidateSetup();
      refreshProfile();
    }
  }, [status, refreshProfile]);

  if (!session) return <Redirect href="/welcome" />;
  const done = () => (router.canGoBack() ? router.back() : router.replace('/'));

  async function start() {
    setError(null);
    setBusy(true);
    try {
      const { url } = await callFunction<{ url: string }>('identity-start');
      setWaiting(true);
      if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
      else await WebBrowser.openBrowserAsync(url);
      await queryClient.invalidateQueries({ queryKey: ['verifications'] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const verified = status === 'verified';
  const who = profile?.role === 'employer' ? 'hire teens' : 'approve jobs and vouch for your teen’s age';

  return (
    <Screen
      onBack={done}
      headerLabel="Verify your identity"
      footer={
        verified
          ? <Button label="Done" onPress={done} />
          : <Button testID="start-identity" label={status === 'failed' ? 'Try again' : status === 'pending' ? 'Continue verification' : 'Start ID verification'} onPress={start} loading={busy} />
      }
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="title" accessibilityRole="header">Verify it's you</Text>
        <VerificationBadge status={status} />
      </View>
      <Text muted>{`Because you'll ${who}, we confirm your identity with a photo of your driver's license or passport and a quick selfie.`}</Text>
      <View style={{ gap: 12 }}>
        {[
          { icon: 'idCard' as const, text: 'Photo of a government-issued ID' },
          { icon: 'camera' as const, text: 'A selfie to match the ID photo' },
          { icon: 'shield' as const, text: 'Handled by Stripe Identity — HireMyJunior never stores your ID images' },
        ].map((r) => (
          <View key={r.text} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icon name={r.icon} size={20} color={t.tint2c} />
            <Text style={{ flex: 1, fontSize: 13.5 }}>{r.text}</Text>
          </View>
        ))}
      </View>
      {waiting && status === 'pending' ? <Notice tone={2} icon="clock">Finish the steps in the window that opened. This page updates automatically.</Notice> : null}
      {status === 'failed' ? <Notice icon="alert">{`That didn't go through: ${latest?.failure_reason ?? 'please try again'}.`}</Notice> : null}
      {verified ? <Notice tone={3} icon="check">You're verified.</Notice> : null}
      {error ? <Notice icon="alert">{error}</Notice> : null}
    </Screen>
  );
}
