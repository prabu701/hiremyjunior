import { Button, Screen, Text } from '@hmj/ui';
import { router } from 'expo-router';
import { GuardianList } from '@/components/GuardianList';

export default function ParentTeens() {
  return (
    <Screen compactTop>
      <Text variant="title">Your teens</Text>
      <GuardianList emptyText="No teens linked yet." onPressItem={(id) => router.push(`/parent/link/${id}`)} />
      <Button testID="invite-teen" label="Invite your teen" variant="secondary" onPress={() => router.push('/parent/invite')} />
    </Screen>
  );
}
