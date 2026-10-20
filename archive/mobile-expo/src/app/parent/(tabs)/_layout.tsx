import { useTheme } from '@hmj/ui';
import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '@/components/TabBar';
import { useMyBookings } from '@/lib/bookings';

export default function ParentTabs() {
  const { t } = useTheme();
  const pending = (useMyBookings().data ?? []).filter((b) => b.needs_action).length;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="approvals" options={{ title: 'Approvals', tabBarBadge: pending || undefined }} />
      <Tabs.Screen name="teens" options={{ title: 'Teens' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
