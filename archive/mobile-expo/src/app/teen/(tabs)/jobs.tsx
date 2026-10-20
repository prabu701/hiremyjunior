import { isTerminal } from '@hmj/booking';
import { Screen, Text, useTheme } from '@hmj/ui';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { BookingRow } from '@/components/BookingRow';
import { useMyBookings } from '@/lib/bookings';

export default function TeenJobs() {
  const { t } = useTheme();
  const q = useMyBookings();
  const rows = q.data ?? [];
  const groups = [
    { title: 'Needs your answer', items: rows.filter((b) => b.needs_action) },
    { title: 'In progress', items: rows.filter((b) => !b.needs_action && !isTerminal(b.state)) },
    { title: 'Past', items: rows.filter((b) => isTerminal(b.state)) },
  ];

  return (
    <Screen compactTop gap={16}>
      <Text variant="title">My Jobs</Text>
      {q.isLoading ? <ActivityIndicator color={t.accent} /> : null}
      {!q.isLoading && rows.length === 0 ? <Text muted>No applications yet. Find a job on Home and tap Apply.</Text> : null}
      {groups.map((g) =>
        g.items.length ? (
          <View key={g.title} style={{ gap: 10 }}>
            <Text variant="label">{g.title}</Text>
            {g.items.map((b) => (
              <BookingRow
                key={b.id}
                b={b}
                subtitle={`${b.employer_name} · ${b.city}${b.origin === 'invited' ? ' · invited you' : ''}`}
                onPress={() => router.push(`/teen/booking/${b.id}`)}
              />
            ))}
          </View>
        ) : null,
      )}
    </Screen>
  );
}
