import { Avatar, Button, ChipGroup, InfoRows, Notice, Screen, Text, toneFor } from '@hmj/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { rateRange } from '@/lib/format';
import { useJuniorCard } from '@/lib/jobs';
import { errorMessage } from '@/lib/rpc';

export default function TeenCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const card = useJuniorCard(id);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/employer/search'));
  if (card.isLoading) return <Screen onBack={back}><ActivityIndicator /></Screen>;
  if (!card.data) return <Screen onBack={back}><Notice icon="alert">{errorMessage(card.error)}</Notice></Screen>;
  const c = card.data;

  return (
    <Screen onBack={back} footer={<Button testID="hire-request" label={`Send ${c.display_name.split(' ')[0]} a hire request`} onPress={() => router.push(`/employer/hire/${c.id}`)} />}>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Avatar name={c.display_name} size={84} tone={toneFor(c.id)} />
        <Text variant="title" style={{ fontSize: 20 }}>{c.display_name}</Text>
        <Text variant="caption">{`Age ${c.age_band ?? '—'} · ${c.distance_mi ?? '—'} mi away · ${c.city}`}</Text>
      </View>
      {c.bio ? <Text style={{ fontSize: 14, lineHeight: 21 }}>{c.bio}</Text> : null}
      <ChipGroup options={c.skill_names.map((s) => ({ value: s, label: s }))} values={c.skill_names} />
      <InfoRows rows={[{ label: 'Hourly Rate', value: rateRange(c.rate_min_cents, c.rate_max_cents), accent: true }, { label: 'Availability', value: c.availability ?? '—' }]} />
      <Notice tone={2} icon="shield">Every teen on HireMyJunior is linked to an ID-verified parent, who approves each job.</Notice>
    </Screen>
  );
}
