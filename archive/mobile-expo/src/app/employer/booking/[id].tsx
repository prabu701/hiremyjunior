import { isTerminal } from '@hmj/booking';
import { Avatar, Badge, Button, Icon, Notice, Screen, Text, toneFor, useTheme } from '@hmj/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { BookingFacts } from '@/components/BookingFacts';
import { Steps } from '@/components/Steps';
import { handshakeSteps, invalidateBookings, stateLabel, stateTone, useBookingDetail } from '@/lib/bookings';
import { errorMessage, rpc } from '@/lib/rpc';

/** An applicant or hire request, from the employer's side (prototype "Employer — Hire Request"). */
export default function EmployerBooking() {
  const { id, sent } = useLocalSearchParams<{ id: string; sent?: string }>();
  const { t } = useTheme();
  const q = useBookingDetail(id);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/employer/jobs'));

  if (q.isLoading) return <Screen onBack={back}><ActivityIndicator /></Screen>;
  if (!q.data) return <Screen onBack={back}><Notice icon="alert">{errorMessage(q.error)}</Notice></Screen>;
  const b = q.data;
  const first = b.junior.name.split(' ')[0]!;

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

  const canAccept = b.state === 'parent_approved' && b.origin === 'applied';
  const canDecline = b.origin === 'applied' && ['applied', 'parent_review', 'parent_approved'].includes(b.state);
  const canCancel = !isTerminal(b.state) && !canDecline && !['in_progress', 'checked_in', 'work_ended'].includes(b.state);

  return (
    <Screen
      onBack={back}
      headerLabel={b.origin === 'invited' ? 'Hire Request' : 'Applicant'}
      headerRight={<Badge label={stateLabel(b.state)} tone={stateTone(b.state)} />}
      footer={
        canAccept || canDecline || canCancel ? (
          <>
            {canAccept ? <Button testID="accept" label={`Confirm ${first}`} onPress={() => act('accept', () => rpc('employer_decide', { booking_id: b.id, accept: true }))} loading={busy === 'accept'} /> : null}
            {canDecline ? <Button testID="decline" label="Decline" variant={canAccept ? 'ghost' : 'secondary'} onPress={() => act('decline', () => rpc('employer_decide', { booking_id: b.id, accept: false }))} loading={busy === 'decline'} /> : null}
            {canCancel ? <Button testID="cancel-booking" label={b.state === 'invited' ? 'Withdraw request' : 'Cancel'} variant="ghost" onPress={() => act('cancel', () => rpc('cancel_booking', { booking_id: b.id }))} loading={busy === 'cancel'} /> : null}
          </>
        ) : (
          <Button label="Back to Search" variant="secondary" onPress={() => router.replace('/employer/search')} />
        )
      }
    >
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Avatar name={b.junior.name} size={64} tone={toneFor(b.junior.id)} />
        <Text variant="title" style={{ fontSize: 20 }}>{b.junior.name}</Text>
        <Text variant="caption">{`Age ${b.junior.age_band ?? '—'} · for ${b.job.title}`}</Text>
      </View>
      {sent === '1' && b.state === 'invited' ? (
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={18} color={t.tint3c} />
          <Text style={{ fontWeight: '600' }} color={t.tint3c}>{`Request sent to ${first}`}</Text>
        </View>
      ) : null}
      <Steps steps={handshakeSteps(b, 'employer', { junior: first, employer: 'You' })} />
      {canAccept ? <Notice tone={3} icon="check">{`${first}'s parent approved. Confirm to lock it in${b.track === 'casual' ? ' — you’ll both get each other’s contact details and the address is shared.' : ' — contact details are exchanged and you take it from there.'}`}</Notice> : null}
      <BookingFacts b={b} />
      {error ? <Notice icon="alert">{error}</Notice> : null}
    </Screen>
  );
}
