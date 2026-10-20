import { Button, Notice, Screen, Text, TextField } from '@hmj/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { GuardianList } from '@/components/GuardianList';
import { invalidateSetup } from '@/lib/queries';
import { errorMessage, rpc } from '@/lib/rpc';

export default function LinkParent() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function link() {
    setError(null);
    setSaving(true);
    try {
      const id = await rpc('link_guardian', { code });
      if (!id) {
        setError("That code isn't valid or has expired. Ask your parent for a new one.");
        return;
      }
      setDone(true);
      setCode('');
      await invalidateSetup();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/teen'))}
      headerLabel="Link your parent"
      footer={<Button testID="link-submit" label="Link account" onPress={link} loading={saving} disabled={code.replace(/[^A-Za-z0-9]/g, '').length < 8} />}
    >
      <Text variant="title" accessibilityRole="header">Enter your parent's code</Text>
      <Text muted>
        Ask your parent or guardian to sign up as a Parent on HireMyJunior. Their app gives them an 8-character invite code — type it here.
      </Text>
      <TextField
        testID="invite-code"
        label="Invite code"
        value={code}
        onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 9))}
        placeholder="ABCD-2345"
        autoCapitalize="characters"
        autoCorrect={false}
        error={error}
        style={{ fontSize: 22, letterSpacing: 4 }}
      />
      {done ? (
        <Notice tone={3} icon="check">Request sent! Your parent will confirm your date of birth to finish linking.</Notice>
      ) : null}
      <View style={{ gap: 10 }}>
        <Text variant="heading" style={{ fontSize: 15 }}>Linked so far</Text>
        <GuardianList emptyText="Nobody yet." />
      </View>
    </Screen>
  );
}
