import { useTheme } from '@hmj/ui';
import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '@/components/TabBar';
import { useMyBookings } from '@/lib/bookings';

export default function EmployerTabs() {
  const { t } = useTheme();
  const waiting = (useMyBookings().data ?? []).filter((b) => b.needs_action).length;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Find Teens' }} />
      <Tabs.Screen name="jobs" options={{ title: 'Jobs', tabBarBadge: waiting || undefined }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
