import { Button, Card, Screen, Text, useTheme } from '@hmj/ui';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Greeting } from '@/components/Greeting';
import { GuardianList } from '@/components/GuardianList';
import { RoleMismatchNotice } from '@/components/RoleMismatchNotice';
import { SetupChecklist } from '@/components/SetupChecklist';
import { useMyBookings } from '@/lib/bookings';

export default function ParentHome() {
  const { t } = useTheme();
  const pending = (useMyBookings().data ?? []).filter((b) => b.needs_action);
  return (
    <Screen compactTop gap={18}>
      <Greeting />
      <RoleMismatchNotice />
      {pending.length ? (
        <Card testID="pending-approvals" onPress={() => router.push('/parent/approvals')} padding={16} style={{ backgroundColor: t.tint1, gap: 4 }}>
          <Text variant="heading" color={t.tint1c}>{`${pending.length} job${pending.length === 1 ? '' : 's'} waiting for your approval`}</Text>
          <Text style={{ fontSize: 13 }} color={t.tint1c}>{pending.map((b) => `${b.junior_name?.split(' ')[0]} → ${b.job_title}`).join(' · ')}</Text>
        </Card>
      ) : null}
      <SetupChecklist />
      <View style={{ gap: 10 }}>
        <Text variant="heading" style={{ fontSize: 15 }}>Your teens</Text>
        <GuardianList emptyText="No teens linked yet." onPressItem={(id) => router.push(`/parent/link/${id}`)} />
        <Button testID="invite-teen" label="Invite your teen" variant="secondary" onPress={() => router.push('/parent/invite')} />
      </View>
    </Screen>
  );
}
