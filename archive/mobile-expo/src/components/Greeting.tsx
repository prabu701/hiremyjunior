import { Avatar, Icon, Text, useTheme } from '@hmj/ui';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useAuth } from '@/lib/auth';

function partOfDay(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/** Prototype home header: greeting, first name, appearance shortcut and avatar. */
export function Greeting({ subtitle }: { subtitle?: string }) {
  const { profile } = useAuth();
  const { t } = useTheme();
  const first = profile?.full_name?.split(' ')[0] ?? 'there';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ gap: 2, flex: 1 }}>
        <Text style={{ fontSize: 13 }} muted>{subtitle ?? partOfDay()}</Text>
        <Text variant="title" style={{ fontSize: 23 }} accessibilityRole="header" testID="greeting">Hey, {first}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => router.push('/appearance')} accessibilityRole="button" accessibilityLabel="Appearance settings" hitSlop={8}>
          <Icon name="palette" size={22} color={t.muted} />
        </Pressable>
        <Avatar name={profile?.full_name} />
      </View>
    </View>
  );
}
