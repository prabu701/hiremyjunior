import { useTheme } from '@hmj/ui';
import { Stack } from 'expo-router';
import { RoleGate } from '@/components/RoleGate';

export default function TeenLayout() {
  const { t } = useTheme();
  return (
    <RoleGate role="junior">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />
    </RoleGate>
  );
}
