import { Button, Screen, Text } from '@hmj/ui';
import { router } from 'expo-router';
import { View } from 'react-native';
import { BookingRow } from '@/components/BookingRow';
import { useAuth } from '@/lib/auth';
import { useMyBookings } from '@/lib/bookings';
import { Greeting } from '@/components/Greeting';
import { RoleMismatchNotice } from '@/components/RoleMismatchNotice';
import { SetupChecklist } from '@/components/SetupChecklist';
import { useMyEmployer } from '@/lib/queries';

export default function EmployerHome() {
  const employer = useMyEmployer();
  const { profile } = useAuth();
  const waiting = (useMyBookings().data ?? []).filter((b) => b.needs_action);
  return (
    <Screen compactTop gap={18}>
      <Greeting subtitle={employer.data?.display_name} />
      <RoleMismatchNotice />
      <SetupChecklist title="Before you can post jobs" />
      {waiting.length ? (
        <View style={{ gap: 10 }}>
          <Text variant="label">Ready for you to confirm</Text>
          {waiting.map((b) => (
            <BookingRow key={b.id} b={b} title={b.junior_name ?? 'Teen'} subtitle={`${b.job_title} · parent approved`} onPress={() => router.push(`/employer/booking/${b.id}`)} />
          ))}
        </View>
      ) : null}
      {profile?.status === 'active' ? (
        <View style={{ gap: 10 }}>
          <Button label="Post a Job" onPress={() => router.push('/employer/post-job')} />
          <Button label="Find Teens Nearby" variant="secondary" onPress={() => router.push('/employer/search')} />
        </View>
      ) : null}
    </Screen>
  );
}
