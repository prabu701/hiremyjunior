import { useTheme } from '@hmj/ui';
import { Stack } from 'expo-router';
import { RoleGate } from '@/components/RoleGate';

export default function AdminLayout() {
  const { t } = useTheme();
  return (
    <RoleGate role="admin">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }} />
    </RoleGate>
  );
}
