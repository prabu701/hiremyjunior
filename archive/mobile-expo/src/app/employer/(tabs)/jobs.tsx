import { Badge, Button, Notice, Screen, Text, useTheme } from '@hmj/ui';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { JobCard } from '@/components/JobCard';
import { useAuth } from '@/lib/auth';
import { dayLabel } from '@/lib/format';
import { useMyJobs } from '@/lib/jobs';

const STATUS: Record<string, { label: string; tone: 1 | 2 | 3 }> = {
  draft: { label: 'Draft', tone: 1 }, posted: { label: 'Posted', tone: 3 }, filled: { label: 'Filled', tone: 2 }, closed: { label: 'Closed', tone: 1 },
};

export default function EmployerJobs() {
  const { profile } = useAuth();
  const { t } = useTheme();
  const jobs = useMyJobs();

  return (
    <Screen compactTop footer={<Button testID="post-job" label="Post a Job" onPress={() => router.push('/employer/post-job')} />}>
      <Text variant="title">Your jobs</Text>
      {profile?.status !== 'active' ? <Notice>Finish verification (Home) to post — you can save drafts meanwhile.</Notice> : null}
      {jobs.isLoading ? <ActivityIndicator color={t.accent} /> : null}
      {jobs.data?.length === 0 ? <Text muted>No jobs yet. Post your first one — it takes about two minutes.</Text> : null}
      {jobs.data?.map((j) => {
        const next = j.job_shifts.map((s) => s.start_at).filter((s) => new Date(s) > new Date()).sort()[0];
        const cover = [...j.job_images].sort((a, b) => a.position - b.position)[0]?.path;
        return (
          <View key={j.id} style={{ gap: 6 }}>
            <JobCard
              job={{ ...j, image_path: cover }}
              meta={next ? `Next: ${dayLabel(next)}` : 'No upcoming dates'}
              onPress={() => router.push(`/employer/job/${j.id}`)}
            />
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Badge label={STATUS[j.status]!.label} tone={STATUS[j.status]!.tone} />
            </View>
          </View>
        );
      })}
    </Screen>
  );
}
