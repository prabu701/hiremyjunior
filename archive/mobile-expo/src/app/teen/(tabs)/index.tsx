import { ChipRow, Notice, Screen, Text, useTheme } from '@hmj/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Greeting } from '@/components/Greeting';
import { JobCard } from '@/components/JobCard';
import { RoleMismatchNotice } from '@/components/RoleMismatchNotice';
import { SearchBar } from '@/components/SearchBar';
import { SetupChecklist } from '@/components/SetupChecklist';
import { useAuth } from '@/lib/auth';
import { useCategories, useJobSearch } from '@/lib/jobs';
import { errorMessage } from '@/lib/rpc';

/** Prototype "Teen — Home Feed". */
export default function TeenHome() {
  const { profile } = useAuth();
  const { t } = useTheme();
  const [category, setCategory] = useState<string>('all');
  const categories = useCategories();
  const jobs = useJobSearch({ category: category === 'all' ? null : category });

  const options = [{ value: 'all', label: 'All' }, ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))];

  return (
    <Screen compactTop gap={16}>
      <Greeting />
      <RoleMismatchNotice />
      <SearchBar placeholder="Search jobs near you" onPress={() => router.push('/teen/search')} />
      <ChipRow options={options} value={category} onChange={setCategory} />
      {profile?.status !== 'active' ? <SetupChecklist title="Before you can apply" /> : null}
      <View style={{ gap: 12 }}>
        {jobs.isLoading ? <ActivityIndicator color={t.accent} /> : null}
        {jobs.error ? <Notice icon="alert">{errorMessage(jobs.error)}</Notice> : null}
        {jobs.data?.length === 0 ? <Text muted>No jobs near you in this category yet. Try "All" or widen your search radius in Profile.</Text> : null}
        {jobs.data?.map((j) => (
          <JobCard key={j.id} job={j} onPress={() => router.push(`/teen/job/${j.id}`)} />
        ))}
      </View>
    </Screen>
  );
}
