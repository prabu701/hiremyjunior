import { ChipRow, Notice, Screen, Text, useTheme } from '@hmj/ui';
import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SearchBar } from '@/components/SearchBar';
import { SetupChecklist } from '@/components/SetupChecklist';
import { TeenCard } from '@/components/TeenCard';
import { useAuth } from '@/lib/auth';
import { useJuniorSearch, useSkills } from '@/lib/jobs';
import { errorMessage } from '@/lib/rpc';

/** Prototype "Employer — Search Teens". */
export default function FindTeens() {
  const { profile } = useAuth();
  const { t } = useTheme();
  const [q, setQ] = useState('');
  const [skill, setSkill] = useState('all');
  const deferredQ = useDeferredValue(q);
  const skills = useSkills();
  const teens = useJuniorSearch({ q: deferredQ.trim(), skill: skill === 'all' ? null : skill });

  if (profile?.status !== 'active') {
    return (
      <Screen compactTop>
        <Text variant="title">Find Teens Nearby</Text>
        <SetupChecklist title="Finish verification to search" />
      </Screen>
    );
  }

  return (
    <Screen compactTop gap={14}>
      <Text variant="title">Find Teens Nearby</Text>
      <SearchBar value={q} onChangeText={setQ} placeholder="Search by skill or name" />
      <ChipRow options={[{ value: 'all', label: 'All' }, ...(skills.data ?? []).map((s) => ({ value: s.id, label: s.name }))]} value={skill} onChange={setSkill} />
      <View style={{ gap: 12 }}>
        {teens.isLoading ? <ActivityIndicator color={t.accent} /> : null}
        {teens.error ? <Notice icon="alert">{errorMessage(teens.error)}</Notice> : null}
        {teens.data?.length === 0 ? <Text muted>No teens match yet.</Text> : null}
        {teens.data?.map((teen) => <TeenCard key={teen.id} teen={teen} onPress={() => router.push(`/employer/teen/${teen.id}`)} />)}
      </View>
    </Screen>
  );
}
