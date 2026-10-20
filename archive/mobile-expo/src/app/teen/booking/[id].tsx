import { isTerminal } from '@hmj/booking';
import { Badge, Button, Icon, Notice, Screen, Text, useTheme } from '@hmj/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { BookingFacts } from '@/components/BookingFacts';
import { Steps } from '@/components/Steps';
import { handshakeSteps, invalidateBookings, stateLabel, stateTone, useBookingDetail } from '@/lib/bookings';
import { errorMessage, rpc } from '@/lib/rpc';

/** Prototype "Teen — Application Sent" + status tracker for any of the teen's bookings. */
export default function TeenBooking() {
  const { id, sent } = useLocalSearchParams<{ id: string; sent?: string }>();
  const { t } = useTheme();
  const q = useBookingDetail(id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/teen/jobs'));

  if (q.isLoading) return <Screen onBack={back}><ActivityIndicator /></Screen>;
  if (!q.data) return <Screen onBack={back}><Notice icon="alert">{errorMessage(q.error)}</Notice></Screen>;
  const b = q.data;

  async function act(name: string, fn: () => Promise<unknown>) {
    setError(null);
    setBusy(name);
    try {
      await fn();
      await invalidateBookings();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const invited = b.state === 'invited';
  const canCancel = !isTerminal(b.state) && !invited && !['in_progress', 'checked_in', 'work_ended'].includes(b.state);
  const justSent = sent === '1' && b.state === 'parent_review';

  return (
    <Screen
      onBack={back}
      headerLabel={b.job.title}
      headerRight={<Badge label={stateLabel(b.state)} tone={stateTone(b.state)} />}
      footer={
        invited ? (
          <>
            <Button testID="accept-invite" label="Accept" onPress={() => act('accept', () => rpc('respond_to_invite', { booking_id: b.id, accept: true }))} loading={busy === 'accept'} />
            <Button testID="decline-invite" label="No thanks" variant="ghost" onPress={() => act('decline', () => rpc('respond_to_invite', { booking_id: b.id, accept: false }))} loading={busy === 'decline'} />
          </>
        ) : justSent ? (
          <>
            <Button label="Track This Job" onPress={() => router.setParams({ sent: '0' })} />
            <Button label="Back to Home" variant="ghost" onPress={() => router.replace('/teen')} />
          </>
        ) : canCancel ? (
          <Button testID="cancel-booking" label="Cancel request" variant="ghost" onPress={() => act('cancel', () => rpc('cancel_booking', { booking_id: b.id }))} loading={busy === 'cancel'} />
        ) : undefined
      }
    >
      {justSent ? (
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
          <View style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: t.tint3, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={30} color={t.tint3c} strokeWidth={2.5} />
          </View>
          <Text variant="title" accessibilityRole="header">Application sent!</Text>
          <Text muted style={{ textAlign: 'center' }}>{`You applied for ${b.job.title}. Here's what happens next.`}</Text>
        </View>
      ) : (
        <Text variant="title" accessibilityRole="header">
          {invited ? `${b.employer.name} wants to hire you` : b.job.title}
        </Text>
      )}
      <Steps steps={handshakeSteps(b, 'junior', { junior: 'you', employer: b.employer.name })} />
      {b.state === 'confirmed' ? <Notice tone={3} icon="check">You're confirmed! Check in when you arrive — the job tracker opens on the day.</Notice> : null}
      <BookingFacts b={b} />
      {error ? <Notice icon="alert">{error}</Notice> : null}
    </Screen>
  );
}
