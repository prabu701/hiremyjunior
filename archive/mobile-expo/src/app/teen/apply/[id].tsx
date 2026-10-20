import { Button, Notice, Screen, Text, TextField } from '@hmj/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { invalidateBookings } from '@/lib/bookings';
import { useJobDetail } from '@/lib/jobs';
import { errorMessage, rpc } from '@/lib/rpc';

export default function Apply() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useJobDetail(id);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setError(null);
    setBusy(true);
    try {
      const bookingId = await rpc('apply_to_job', { job_id: id, message });
      await invalidateBookings();
      router.replace(`/teen/booking/${bookingId}?sent=1`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen onBack={() => router.back()} headerLabel="Apply" footer={<Button testID="send-application" label="Send application" onPress={send} loading={busy} />}>
      <Text variant="title" accessibilityRole="header">{job.data?.title ?? 'Apply'}</Text>
      <Text muted>{`Say hi to ${job.data?.employer.name ?? 'the employer'} — why you'd be great for this job. Your parent sees this too.`}</Text>
      <TextField testID="application-message" label="Note (optional)" value={message} onChangeText={setMessage} placeholder="I have two dogs of my own and I'm free every weekend!" multiline maxLength={500} style={{ minHeight: 90 }} />
      <Notice tone={2} icon="shield">Keep contact info out of notes — phone numbers and e-mails are hidden until the job is confirmed.</Notice>
      {error ? <Notice icon="alert">{error}</Notice> : null}
    </Screen>
  );
}
