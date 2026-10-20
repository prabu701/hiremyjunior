import { Button, Notice, Screen, Text, TextField } from '@hmj/ui';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { callFunction } from '@/lib/functions';
import { invalidateSetup } from '@/lib/queries';
import { errorMessage } from '@/lib/rpc';

/** Two steps on one screen: number → SMS code. Shared by every role. */
export default function VerifyPhone() {
  const { session, profile, refreshProfile } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'number' | 'code'>('number');
  const [mode, setMode] = useState<'live' | 'mock'>('live');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!session) return <Redirect href="/welcome" />;
  const done = () => (router.canGoBack() ? router.back() : router.replace('/'));

  async function send() {
    setError(null);
    setBusy(true);
    try {
      const res = await callFunction<{ mode: 'live' | 'mock' }>('verify-phone', { action: 'start', phone });
      setMode(res.mode);
      setStep('code');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function check(value = code) {
    setError(null);
    setBusy(true);
    try {
      await callFunction('verify-phone', { action: 'check', code: value });
      await Promise.all([refreshProfile(), invalidateSetup()]);
      done();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      onBack={step === 'code' ? () => setStep('number') : done}
      headerLabel="Verify your phone"
      footer={
        step === 'number'
          ? <Button testID="send-sms" label="Text me a code" onPress={send} loading={busy} />
          : <Button testID="check-sms" label="Verify" onPress={() => check()} loading={busy} />
      }
    >
      {step === 'number' ? (
        <>
          <Text variant="title" accessibilityRole="header">What's your mobile number?</Text>
          <Text muted>We'll text a 6-digit code. Parents and employers are only reachable through HireMyJunior until a job is confirmed.</Text>
          <TextField
            testID="phone"
            label="Mobile number"
            value={phone}
            onChangeText={setPhone}
            placeholder={profile?.phone ?? '(425) 555-0123'}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            autoFocus
            error={error}
          />
        </>
      ) : (
        <>
          <Text variant="title" accessibilityRole="header">Enter the code</Text>
          <Text muted>We texted a code to {phone}.</Text>
          <TextField
            testID="sms-code"
            label="6-digit code"
            value={code}
            onChangeText={(v) => {
              const digits = v.replace(/\D/g, '').slice(0, 6);
              setCode(digits);
              if (digits.length === 6) check(digits);
            }}
            placeholder="123456"
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            autoFocus
            error={error}
            style={{ fontSize: 24, letterSpacing: 8 }}
          />
          {mode === 'mock' ? (
            <Notice tone={2}>Test mode: no real text is sent. The code is in the local inbox (Mailpit, localhost:8025) as “SMS to …”.</Notice>
          ) : null}
        </>
      )}
    </Screen>
  );
}
