import { useTheme } from '@hmj/ui';
import { Stack } from 'expo-router';
import { RoleGate } from '@/components/RoleGate';

export default function ParentLayout() {
  const { t } = useTheme();
  return (
    <RoleGate role="parent">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />
    </RoleGate>
  );
}
