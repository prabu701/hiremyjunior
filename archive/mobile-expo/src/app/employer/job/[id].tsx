import { Badge, Button, InfoRows, Notice, Screen, Text } from '@hmj/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { BookingRow } from '@/components/BookingRow';
import { JobDetailBody } from '@/components/JobDetailBody';
import { useMyBookings } from '@/lib/bookings';
import { useJobDetail } from '@/lib/jobs';
import { queryClient } from '@/lib/queries';
import { errorMessage, rpc } from '@/lib/rpc';

export default function EmployerJobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useJobDetail(id);
  const bookings = useMyBookings();
  const applicants = (bookings.data ?? []).filter((b) => b.job_id === id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/employer/jobs'));

  if (job.isLoading) return <Screen onBack={back}><ActivityIndicator /></Screen>;
  if (!job.data) return <Screen onBack={back}><Notice icon="alert">{errorMessage(job.error)}</Notice></Screen>;
  const j = job.data;

  async function setStatus(status: 'posted' | 'closed') {
    setError(null);
    setBusy(true);
    try {
      await rpc('set_job_status', { job_id: j.id, status });
      await Promise.all(['my-jobs', 'job'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      onBack={back}
      headerLabel="Your job"
      headerRight={<Badge label={j.status[0]!.toUpperCase() + j.status.slice(1)} tone={j.status === 'posted' ? 3 : 1} />}
      footer={
        <>
          {j.status !== 'filled' && j.status !== 'closed' ? <Button testID="edit-job" label="Edit" variant="secondary" onPress={() => router.push(`/employer/post-job?id=${j.id}`)} /> : null}
          {j.status === 'posted' ? <Button testID="close-job" label="Close job" variant="ghost" onPress={() => setStatus('closed')} loading={busy} /> : null}
          {j.status === 'closed' || j.status === 'draft' ? <Button testID="repost-job" label="Post" onPress={() => setStatus('posted')} loading={busy} /> : null}
        </>
      }
    >
      {applicants.length ? (
        <View style={{ gap: 10 }}>
          <Text variant="heading" style={{ fontSize: 15 }}>{`Applicants & requests (${applicants.length})`}</Text>
          {applicants.map((b) => (
            <BookingRow key={b.id} b={b} title={b.junior_name ?? 'Teen'} subtitle={b.origin === 'invited' ? 'You invited them' : 'Applied'} onPress={() => router.push(`/employer/booking/${b.id}`)} />
          ))}
        </View>
      ) : null}
      <JobDetailBody job={j} />
      <View>
        <InfoRows rows={[{ label: 'Address (private)', value: j.address?.line ?? '—' }, ...(j.address?.notes ? [{ label: 'Access notes', value: j.address.notes }] : [])]} />
      </View>
      {error ? <Notice icon="alert">{error}</Notice> : null}
    </Screen>
  );
}
