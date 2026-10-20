import { ChipRow, Notice, Screen, Text, useTheme } from '@hmj/ui';
import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { JobCard } from '@/components/JobCard';
import { SearchBar } from '@/components/SearchBar';
import { useCategories, useJobSearch } from '@/lib/jobs';
import { errorMessage } from '@/lib/rpc';

const RADII = [
  { value: '2', label: '2 mi' },
  { value: '5', label: '5 mi' },
  { value: '10', label: '10 mi' },
  { value: '25', label: '25 mi' },
];

export default function TeenSearch() {
  const { t } = useTheme();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [radius, setRadius] = useState('10');
  const deferredQ = useDeferredValue(q);
  const categories = useCategories();
  const jobs = useJobSearch({ q: deferredQ.trim(), category: category === 'all' ? null : category, radius: Number(radius) });

  return (
    <Screen compactTop gap={14}>
      <Text variant="title">Search</Text>
      <SearchBar value={q} onChangeText={setQ} placeholder="Dog walking, tutoring, lawn…" />
      <ChipRow options={[{ value: 'all', label: 'All' }, ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))]} value={category} onChange={setCategory} />
      <ChipRow options={RADII} value={radius} onChange={setRadius} />
      <View style={{ gap: 12 }}>
        {jobs.isFetching && !jobs.data ? <ActivityIndicator color={t.accent} /> : null}
        {jobs.error ? <Notice icon="alert">{errorMessage(jobs.error)}</Notice> : null}
        {jobs.data ? <Text variant="caption">{`${jobs.data.length} job${jobs.data.length === 1 ? '' : 's'} within ${radius} miles`}</Text> : null}
        {jobs.data?.map((j) => <JobCard key={j.id} job={j} onPress={() => router.push(`/teen/job/${j.id}`)} />)}
      </View>
    </Screen>
  );
}
