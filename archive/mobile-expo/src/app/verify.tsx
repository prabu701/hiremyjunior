import { isSelfServeRole, otpSchema, ROLE_COPY } from '@hmj/shared';
import { Button, Screen, Text, TextField, useTheme } from '@hmj/ui';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { useAuth } from '@/lib/auth';
import { friendlyAuthError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

const RESEND_SECONDS = 30;

/** Step 2: enter the e-mailed code. */
export default function Verify() {
  const { email, role } = useLocalSearchParams<{ email?: string; role?: string }>();
  const { session } = useAuth();
  const { t } = useTheme();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  if (session) return <Redirect href="/home" />;
  const isAdmin = role === 'admin';
  if (!email || (!isSelfServeRole(role) && !isAdmin)) return <Redirect href="/welcome" />;

  async function verify(value = code) {
    const parsed = otpSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter the 6-digit code');
      return;
    }
    setError(null);
    setVerifying(true);
    const { error: authError } = await supabase.auth.verifyOtp({ email: email!, token: parsed.data, type: 'email' });
    setVerifying(false);
    if (authError) {
      setError(friendlyAuthError(authError.message));
      return;
    }
    router.replace({ pathname: '/home', params: { requested: role } });
  }

  async function resend() {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email!,
      options: isAdmin ? { shouldCreateUser: false } : { shouldCreateUser: true, data: { role } },
    });
    if (authError) {
      setError(friendlyAuthError(authError.message));
      return;
    }
    setInfo('New code sent.');
    setCooldown(RESEND_SECONDS);
  }

  return (
    <Screen
      onBack={() => router.back()}
      headerLabel={`Step 2 of 2 · ${isAdmin ? 'Admin' : ROLE_COPY[role].label} sign-in`}
      footer={<Button testID="verify-code" label="Verify & continue" onPress={() => verify()} loading={verifying} />}
    >
      <Text variant="title" accessibilityRole="header">
        Check your email
      </Text>
      <Text muted>
        We sent a 6-digit code to <Text style={{ fontWeight: '700' }}>{email}</Text>. It expires in 10 minutes.
      </Text>
      <TextField
        testID="otp"
        label="6-digit code"
        value={code}
        onChangeText={(v) => {
          const digits = v.replace(/\D/g, '').slice(0, 6);
          setCode(digits);
          if (digits.length === 6) verify(digits);
        }}
        placeholder="123456"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        autoFocus
        error={error}
        style={{ fontSize: 24, letterSpacing: 8 }}
      />
      {info ? <Text variant="caption">{info}</Text> : null}
      <Pressable onPress={resend} disabled={cooldown > 0} accessibilityRole="button">
        <Text variant="caption" color={cooldown > 0 ? t.muted : t.accent}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </Text>
      </Pressable>
    </Screen>
  );
}
