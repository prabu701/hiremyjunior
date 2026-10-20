import { emailSchema, isSelfServeRole, ROLE_COPY } from '@hmj/shared';
import { Button, Notice, Screen, Text, TextField } from '@hmj/ui';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { friendlyAuthError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

const ROLE_NOTICE = {
  junior: "After you sign in, you'll link your account to a parent or guardian — they approve every job.",
  parent: "You'll verify your identity next, then link your teen with an invite code.",
  employer: 'Every employer is identity- and background-checked before posting jobs.',
} as const;

/** Step 1: e-mail entry. Sends a 6-digit code (new accounts are created with the chosen role). */
export default function SignIn() {
  const { role } = useLocalSearchParams<{ role?: string }>();
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Admins are provisioned by ops (scripts/create-admin.mjs) and sign in at /sign-in?role=admin.
  const isAdmin = role === 'admin';
  if (session) return <Redirect href="/home" />;
  if (!isSelfServeRole(role) && !isAdmin) return <Redirect href="/welcome" />;

  async function sendCode() {
    if (!isSelfServeRole(role) && !isAdmin) return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email address');
      return;
    }
    setError(null);
    setSending(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: isAdmin ? { shouldCreateUser: false } : { shouldCreateUser: true, data: { role } },
    });
    setSending(false);
    if (authError) {
      setError(friendlyAuthError(authError.message));
      return;
    }
    router.push({ pathname: '/verify', params: { email: parsed.data, role } });
  }

  return (
    <Screen
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))}
      headerLabel={`Step 1 of 2 · ${isAdmin ? 'Admin' : ROLE_COPY[role].label} sign-in`}
      footer={<Button testID="send-code" label="Send code" onPress={sendCode} loading={sending} />}
    >
      <Text variant="title" accessibilityRole="header">
        What's your email?
      </Text>
      <Text muted>New here or coming back — either way we'll email you a 6-digit code. No password needed.</Text>
      <View style={{ gap: 16 }}>
        <TextField
          testID="email"
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="maya@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={sendCode}
          autoFocus
          error={error}
        />
      </View>
      {isAdmin ? null : <Notice>{ROLE_NOTICE[role]}</Notice>}
    </Screen>
  );
}
