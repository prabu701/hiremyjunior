import { Button, ChipGroup, Notice, Screen, Text, TextField } from '@hmj/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { invalidateBookings } from '@/lib/bookings';
import { useJuniorCard, useMyJobs } from '@/lib/jobs';
import { errorMessage, rpc } from '@/lib/rpc';

export default function HireRequest() {
  const { juniorId } = useLocalSearchParams<{ juniorId: string }>();
  const teen = useJuniorCard(juniorId);
  const jobs = useMyJobs();
  const posted = (jobs.data ?? []).filter((j) => j.status === 'posted');
  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const first = teen.data?.display_name.split(' ')[0] ?? 'them';

  async function send() {
    if (!jobId) return setError('Pick which job this is for.');
    setError(null);
    setBusy(true);
    try {
      const id = await rpc('invite_junior', { job_id: jobId, junior_id: juniorId, message });
      await invalidateBookings();
      router.replace(`/employer/booking/${id}?sent=1`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen onBack={() => router.back()} headerLabel="Hire Request" footer={<Button testID="send-hire-request" label={`Send to ${first}`} onPress={send} loading={busy} disabled={!posted.length} />}>
      <Text variant="title" accessibilityRole="header">{`Invite ${teen.data?.display_name ?? ''}`}</Text>
      {jobs.isLoading ? <ActivityIndicator /> : null}
      {!jobs.isLoading && !posted.length ? (
        <Notice>Post a job first — hire requests are always for a specific job.</Notice>
      ) : (
        <View style={{ gap: 10 }}>
          <Text variant="label">Which job?</Text>
          <ChipGroup options={posted.map((j) => ({ value: j.id, label: j.title }))} values={jobId ? [jobId] : []} onToggle={setJobId} />
        </View>
      )}
      <TextField testID="hire-message" label="Message (optional)" value={message} onChangeText={setMessage} placeholder="We'd love your help on Saturday mornings!" multiline maxLength={500} style={{ minHeight: 80 }} />
      <Notice tone={2} icon="shield">{`${first} accepts first, then a parent approves. Contact details are shared once it's confirmed.`}</Notice>
      {error ? <Notice icon="alert">{error}</Notice> : null}
    </Screen>
  );
}
