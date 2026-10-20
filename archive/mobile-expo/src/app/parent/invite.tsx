import { useQuery } from '@tanstack/react-query';
import { Button, Card, Icon, Notice, Screen, Text, useTheme, FONTS } from '@hmj/ui';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { queryClient } from '@/lib/queries';
import { errorMessage, rpc, toAppError } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';

const pretty = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

export default function InviteTeen() {
  const { session } = useAuth();
  const { t, radius } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const invites = useQuery({
    queryKey: ['invites', session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guardian_invites')
        .select('*')
        .is('redeemed_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (error) throw toAppError(error);
      return data;
    },
  });

  async function create() {
    setError(null);
    setCreating(true);
    try {
      await rpc('create_guardian_invite');
      await queryClient.invalidateQueries({ queryKey: ['invites'] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  const latest = invites.data?.[0];

  return (
    <Screen
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/parent'))}
      headerLabel="Invite your teen"
      footer={<Button testID="new-invite" label={latest ? 'Get another code' : 'Get invite code'} onPress={create} loading={creating} variant={latest ? 'secondary' : 'primary'} />}
    >
      <Text variant="title" accessibilityRole="header">Link your teen's account</Text>
      <Text muted>
        Have your teen download HireMyJunior and sign up as a Teen. Then give them this code — they enter it under Profile → Link a parent. You'll confirm their date of birth to finish.
      </Text>

      {latest ? (
        <Card padding={24} style={{ alignItems: 'center', gap: 12 }}>
          <Text variant="caption">Invite code · expires {new Date(latest.expires_at).toLocaleDateString()}</Text>
          <Text testID="invite-code-value" selectable style={{ fontFamily: FONTS.displayBold, fontSize: 36, letterSpacing: 4 }}>
            {pretty(latest.code)}
          </Text>
          <Pressable
            onPress={async () => {
              await Clipboard.setStringAsync(latest.code);
              setCopied(latest.code);
            }}
            accessibilityRole="button"
            style={{ flexDirection: 'row', gap: 6, alignItems: 'center', padding: 8, borderRadius: radius.chip, backgroundColor: t.tint2 }}
          >
            <Icon name={copied === latest.code ? 'check' : 'copy'} size={16} color={t.tint2c} />
            <Text style={{ fontSize: 13 }} color={t.tint2c}>{copied === latest.code ? 'Copied' : 'Copy code'}</Text>
          </Pressable>
        </Card>
      ) : null}

      {invites.data && invites.data.length > 1 ? (
        <View style={{ gap: 6 }}>
          <Text variant="label">Other unused codes</Text>
          {invites.data.slice(1).map((i) => (
            <Text key={i.code} selectable style={{ letterSpacing: 2 }}>{pretty(i.code)}</Text>
          ))}
        </View>
      ) : null}

      {error ? <Notice icon="alert">{error}</Notice> : null}
      <Notice tone={2} icon="shield">Each code works once and expires after 7 days. Two parents? Each of you can link the same teen.</Notice>
    </Screen>
  );
}
