import { Avatar, InfoRows, Screen, Text, useTheme } from '@hmj/ui';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { SignOutButton } from '@/components/SignOutButton';
import { useAuth } from '@/lib/auth';

/** Generic profile tab for parents and employers. */
export function ProfileTab({ rows, children }: { rows: { label: string; value: string }[]; children?: ReactNode }) {
  const { profile } = useAuth();
  const { t } = useTheme();
  return (
    <Screen compactTop>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="title" style={{ fontSize: 19 }}>Profile</Text>
        <Pressable onPress={() => router.push('/onboarding')} accessibilityRole="button" hitSlop={8}>
          <Text style={{ fontSize: 13, fontWeight: '600' }} color={t.accent}>Edit</Text>
        </Pressable>
      </View>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Avatar name={profile?.full_name} size={84} />
        <Text variant="title" style={{ fontSize: 19 }}>{profile?.full_name}</Text>
      </View>
      <InfoRows
        rows={[
          { label: 'Status', value: profile?.status === 'active' ? 'Verified' : 'Setup in progress' },
          { label: 'Email', value: profile?.email ?? '' },
          { label: 'Phone', value: profile?.phone ? `${profile.phone}${profile.phone_verified_at ? ' ✓' : ''}` : '—' },
          ...rows,
        ]}
      />
      {children}
      <SignOutButton />
    </Screen>
  );
}
