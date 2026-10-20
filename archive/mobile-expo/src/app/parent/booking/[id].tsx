import { isTerminal } from '@hmj/booking';
import { Avatar, Badge, Button, Card, FONTS, Icon, Notice, Screen, Text, TextField, toneFor, useTheme } from '@hmj/ui';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { BookingFacts } from '@/components/BookingFacts';
import { Steps } from '@/components/Steps';
import { handshakeSteps, invalidateBookings, stateLabel, stateTone, useBookingDetail } from '@/lib/bookings';
import { queryClient } from '@/lib/queries';
import { errorMessage, rpc } from '@/lib/rpc';

/** Prototype "Parent — Approve Job", plus status for bookings that are already decided. */
export default function ParentBooking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTheme();
  const q = useBookingDetail(id);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/parent/approvals'));

  if (q.isLoading) return <Screen onBack={back}><ActivityIndicator /></Screen>;
  if (!q.data) return <Screen onBack={back}><Notice icon="alert">{errorMessage(q.error)}</Notice></Screen>;
  const b = q.data;
  const first = b.junior.name.split(' ')[0];
  const deciding = b.state === 'parent_review';

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

  const cancellable = !isTerminal(b.state) && !deciding && !['in_progress', 'checked_in', 'work_ended'].includes(b.state);

  return (
    <Screen
      onBack={back}
      headerLabel={deciding ? 'Approval needed' : 'Job request'}
      headerRight={<Badge label={stateLabel(b.state)} tone={stateTone(b.state)} />}
      footer={
        deciding ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Button testID="decline" label="Decline" variant="secondary" onPress={() => act('decline', () => rpc('parent_decide', { booking_id: b.id, approve: false, reason }))} loading={busy === 'decline'} /></View>
            <View style={{ flex: 1 }}><Button testID="approve" label="Approve" onPress={() => act('approve', () => rpc('parent_decide', { booking_id: b.id, approve: true, reason }))} loading={busy === 'approve'} /></View>
          </View>
        ) : cancellable ? (
          <Button testID="cancel-booking" label={`Cancel for ${first}`} variant="ghost" onPress={() => act('cancel', () => rpc('cancel_booking', { booking_id: b.id, reason: 'Cancelled by parent' }))} loading={busy === 'cancel'} />
        ) : undefined
      }
    >
      <Text variant="title" accessibilityRole="header">{`${first} ${b.origin === 'invited' ? 'was invited to work' : 'wants to work'} "${b.job.title}"`}</Text>

      <Card padding={16} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={b.employer.name} size={48} tone={toneFor(b.employer.id)} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15 }}>{b.employer.name}</Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Icon name="shield" size={13} color={t.tint3c} />
            <Text variant="caption">{b.employer.kind === 'business' ? 'Verified business · WA minor work permit on file' : 'ID-verified · background check passed'}</Text>
          </View>
        </View>
      </Card>

      <BookingFacts b={b} />

      {deciding ? (
        <>
          <TextField testID="parent-reason" label="Note (optional — shared with your teen)" value={reason} onChangeText={setReason} placeholder="e.g. Only if you're home by 9" maxLength={300} />
          <Notice tone={2} icon="shield">
            {b.track === 'casual'
              ? "The employer's background check is already on file — this only starts once you approve."
              : 'This is a business job. If you approve, HireMyJunior introduces your teen; the business then handles hiring paperwork (including a Parent/School Authorization you’ll sign) and pay directly.'}
          </Notice>
        </>
      ) : (
        <Steps steps={handshakeSteps(b, 'parent', { junior: first!, employer: b.employer.name })} />
      )}

      {b.fast_path ? <Notice tone={2} icon="info">{`Auto-approved because you trust ${b.employer.name}. You can still cancel before the job starts.`}</Notice> : null}

      {b.can_trust ? (
        <Pressable
          testID="trust-employer"
          onPress={() => act('trust', async () => {
            await rpc('set_trusted_employer', { junior_id: b.junior.id, employer_id: b.employer.id, trusted: !b.trusted });
            await queryClient.invalidateQueries({ queryKey: ['booking', b.id] });
          })}
          accessibilityRole="switch"
          accessibilityState={{ checked: !!b.trusted }}
          style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
        >
          <View style={{ width: 44, height: 26, borderRadius: 999, backgroundColor: b.trusted ? t.accent : t.navBorder, padding: 3, alignItems: b.trusted ? 'flex-end' : 'flex-start' }}>
            <View style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: '#fff' }} />
          </View>
          <Text style={{ flex: 1, fontSize: 13.5 }}>{`Trust ${b.employer.name}: future jobs with ${first} skip approval (you can still veto)`}</Text>
        </Pressable>
      ) : null}
      {error ? <Notice icon="alert">{error}</Notice> : null}
    </Screen>
  );
}
