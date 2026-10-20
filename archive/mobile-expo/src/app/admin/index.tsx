import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Screen, Text, useTheme } from '@hmj/ui';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { SignOutButton } from '@/components/SignOutButton';
import { rpc } from '@/lib/rpc';

export const KIND_LABEL: Record<string, string> = {
  proof_of_age: 'Proof of age',
  business_registration: 'Business registration (UBI)',
  work_permit: 'Minor Work Permit Endorsement',
  background_check: 'Background check',
  supervisor_check: 'Supervisor background check',
  identity: 'Identity',
  phone: 'Phone',
};

/** Ops review queue: manual checks, plus simulated vendor checks awaiting a result. */
export default function AdminQueue() {
  const { t } = useTheme();
  const queue = useQuery({ queryKey: ['admin-queue'], queryFn: () => rpc('admin_verification_queue'), refetchInterval: 10_000 });

  return (
    <Screen compactTop footer={<SignOutButton />}>
      <View style={{ gap: 4 }}>
        <Text variant="caption">HireMyJunior ops</Text>
        <Text variant="title" accessibilityRole="header">Review queue</Text>
      </View>
      {queue.isLoading ? <ActivityIndicator color={t.accent} /> : null}
      {queue.data?.length === 0 ? <Text muted>Nothing waiting. 🎉</Text> : null}
      {queue.data?.map((v) => (
        <Card key={v.id} testID={`queue-${v.kind}`} onPress={() => router.push(`/admin/review/${v.id}`)} padding={14} style={{ gap: 6 }} accessibilityLabel={`${KIND_LABEL[v.kind]} for ${v.subject_name}`}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ fontSize: 14.5, flex: 1 }}>{KIND_LABEL[v.kind] ?? v.kind}</Text>
            <Badge label={v.provider.startsWith('mock') ? 'Simulated vendor' : 'Manual'} tone={v.provider.startsWith('mock') ? 2 : 1} />
          </View>
          <Text variant="caption">{`${v.subject_name ?? v.subject_email} · ${v.subject_role} · ${new Date(v.created_at).toLocaleString()}`}</Text>
        </Card>
      ))}
    </Screen>
  );
}
