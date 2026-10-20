import { ROLE_COPY, type SelfServeRole } from '@hmj/shared';
import { ActionCard, Screen, Text, useTheme, type IconName } from '@hmj/ui';
import { Redirect, router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useAuth } from '@/lib/auth';

const ROLE_CARDS: { role: SelfServeRole; icon: IconName; tone: 1 | 2 | 3 }[] = [
  { role: 'junior', icon: 'user', tone: 1 },
  { role: 'parent', icon: 'shield', tone: 2 },
  { role: 'employer', icon: 'briefcase', tone: 3 },
];

/** Prototype screen "Start — Choose Role". */
export default function Welcome() {
  const { session } = useAuth();
  const { t } = useTheme();
  if (session) return <Redirect href="/home" />;

  return (
    <Screen gap={34}>
      <View style={{ gap: 8 }}>
        <Text variant="display" accessibilityRole="header">
          HireMyJunior
        </Text>
        <Text muted>Real jobs for teens, with parents and employers verified every step of the way. Who's signing up?</Text>
      </View>

      <View style={{ gap: 14 }}>
        {ROLE_CARDS.map(({ role, icon, tone }) => (
          <ActionCard
            key={role}
            testID={`role-${role}`}
            icon={icon}
            tone={tone}
            title={ROLE_COPY[role].title}
            subtitle={ROLE_COPY[role].tagline}
            onPress={() => router.push({ pathname: '/sign-in', params: { role } })}
          />
        ))}
      </View>

      <Pressable onPress={() => router.push('/appearance')} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
        <Text variant="caption" color={t.muted}>
          Appearance
        </Text>
      </Pressable>
    </Screen>
  );
}
