import { useQuery } from '@tanstack/react-query';
import { Avatar, Button, InfoRows, Notice, Screen, Text, useTheme } from '@hmj/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { DateField, formatUsDate, parseUsDate } from '@/components/DateField';
import { useAuth } from '@/lib/auth';
import { invalidateSetup } from '@/lib/queries';
import { errorMessage, rpc, toAppError } from '@/lib/rpc';
import { supabase } from '@/lib/supabase';

/** Parent confirms a teen's link request and attests their date of birth. */
export default function ConfirmTeen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refreshProfile } = useAuth();
  const { t, radius } = useTheme();
  const [dob, setDob] = useState('');
  const [attested, setAttested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'confirm' | 'remove' | null>(null);

  const link = useQuery({
    queryKey: ['guardianship', id],
    queryFn: async () => {
      const { data: g, error } = await supabase
        .from('guardianships')
        .select('*, junior:profiles!guardianships_junior_id_fkey(full_name, email)')
        .eq('id', id)
        .single();
      if (error) throw toAppError(error);
      const { data: j, error: je } = await supabase.from('juniors').select('*').eq('profile_id', g.junior_id).maybeSingle();
      if (je) throw toAppError(je);
      return { g, j };
    },
  });

  const done = () => (router.canGoBack() ? router.back() : router.replace('/parent'));

  if (link.isLoading) return <Screen onBack={done}><ActivityIndicator color={t.accent} /></Screen>;
  if (!link.data) return <Screen onBack={done}><Notice icon="alert">This link request no longer exists.</Notice></Screen>;

  const { g, j } = link.data;
  const name = g.junior?.full_name ?? 'your teen';
  const first = name.split(' ')[0];
  const active = g.status === 'active';

  async function run(kind: 'confirm' | 'remove') {
    setError(null);
    const iso = parseUsDate(dob);
    if (kind === 'confirm' && !iso) return setError('Enter the date of birth as MM/DD/YYYY.');
    if (kind === 'confirm' && !attested) return setError('Please confirm you are their parent or legal guardian.');
    setBusy(kind);
    try {
      if (kind === 'confirm') await rpc('confirm_guardianship', { guardianship_id: g.id, dob: iso! });
      else await rpc('remove_guardianship', { guardianship_id: g.id });
      await Promise.all([invalidateSetup(), refreshProfile()]);
      done();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen
      onBack={done}
      headerLabel={active ? 'Linked teen' : 'Confirm your teen'}
      footer={
        <>
          {!active ? <Button testID="confirm-teen" label={`Confirm ${first}`} onPress={() => run('confirm')} loading={busy === 'confirm'} /> : null}
          <Button testID="remove-teen" label={active ? 'Remove link' : "This isn't my teen"} variant="ghost" onPress={() => run('remove')} loading={busy === 'remove'} />
        </>
      }
    >
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Avatar name={name} size={72} />
        <Text variant="title" style={{ fontSize: 20 }}>{name}</Text>
      </View>
      <InfoRows
        rows={[
          { label: 'Email', value: g.junior?.email ?? '' },
          { label: 'School', value: j?.school_name ?? '—' },
          { label: 'Lives in', value: j ? `${j.city} ${j.zip}` : '—' },
          active
            ? { label: 'Date of birth', value: formatUsDate(j?.dob) }
            : { label: `${first} entered`, value: formatUsDate(j?.dob_claimed) },
        ]}
      />

      {active ? (
        <Notice tone={3} icon="check">{`You're linked. You'll approve each job ${first} applies for.`}</Notice>
      ) : (
        <>
          <DateField testID="attest-dob" label={`${first}'s date of birth`} value={dob} onChange={setDob} />
          <Pressable
            testID="attest-checkbox"
            onPress={() => setAttested((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: attested }}
            style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}
          >
            <View style={{ width: 22, height: 22, borderRadius: radius.tile ? 6 : 0, borderWidth: 2, borderColor: attested ? t.accent : t.navBorder, backgroundColor: attested ? t.accent : 'transparent', marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 20 }}>
              {`I'm ${first}'s parent or legal guardian, and this date of birth is correct.`}
            </Text>
          </Pressable>
          <Notice tone={2} icon="shield">
            Your confirmation is how HireMyJunior verifies a teen's age. It's recorded with your verified identity.
          </Notice>
        </>
      )}
      {error ? <Notice icon="alert">{error}</Notice> : null}
    </Screen>
  );
}
