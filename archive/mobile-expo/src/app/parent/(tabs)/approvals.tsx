import { isTerminal } from '@hmj/booking';
import { Screen, Text, useTheme } from '@hmj/ui';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { BookingRow } from '@/components/BookingRow';
import { useMyBookings } from '@/lib/bookings';

export default function ParentApprovals() {
  const { t } = useTheme();
  const q = useMyBookings();
  const rows = q.data ?? [];
  const groups = [
    { title: 'Needs your approval', items: rows.filter((b) => b.needs_action) },
    { title: 'Active', items: rows.filter((b) => !b.needs_action && !isTerminal(b.state)) },
    { title: 'Past', items: rows.filter((b) => isTerminal(b.state)) },
  ];
  return (
    <Screen compactTop gap={16}>
      <Text variant="title">Approvals</Text>
      {q.isLoading ? <ActivityIndicator color={t.accent} /> : null}
      {!q.isLoading && rows.length === 0 ? <Text muted>When your teen applies for a job — or an employer invites them — it shows up here for you to approve.</Text> : null}
      {groups.map((g) =>
        g.items.length ? (
          <View key={g.title} style={{ gap: 10 }}>
            <Text variant="label">{g.title}</Text>
            {g.items.map((b) => (
              <BookingRow
                key={b.id}
                b={b}
                subtitle={`${b.junior_name?.split(' ')[0]} · ${b.employer_name}${b.fast_path ? ' · auto-approved (trusted)' : ''}`}
                onPress={() => router.push(`/parent/booking/${b.id}`)}
              />
            ))}
          </View>
        ) : null,
      )}
    </Screen>
  );
}
