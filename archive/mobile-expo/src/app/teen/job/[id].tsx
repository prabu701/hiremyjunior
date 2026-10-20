import { isTerminal, type BookingState } from '@hmj/booking';
import { Button, Notice, Screen } from '@hmj/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { JobDetailBody } from '@/components/JobDetailBody';
import { useAuth } from '@/lib/auth';
import { useJobDetail } from '@/lib/jobs';
import { errorMessage } from '@/lib/rpc';

export default function TeenJobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const job = useJobDetail(id);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/teen'));

  if (job.isLoading) return <Screen onBack={back}><ActivityIndicator /></Screen>;
  if (!job.data) return <Screen onBack={back}><Notice icon="alert">{errorMessage(job.error)}</Notice></Screen>;
  const active = profile?.status === 'active';
  const mine = (job.data as unknown as { my_booking?: { id: string; state: BookingState } | null }).my_booking;
  const open = mine && !isTerminal(mine.state);

  return (
    <Screen
      onBack={back}
      footer={
        open
          ? <Button testID="view-request" label="View your request" onPress={() => router.push(`/teen/booking/${mine.id}`)} />
          : <Button testID="apply" label="Apply for This Job" disabled={!active || job.data.status !== 'posted'} onPress={() => router.push(`/teen/apply/${job.data!.id}`)} />
      }
    >
      <JobDetailBody job={job.data} />
      <Notice>{active ? 'Your parent will need to approve this job before you can start.' : 'Finish setting up your account (Home) before you can apply.'}</Notice>
    </Screen>
  );
}
