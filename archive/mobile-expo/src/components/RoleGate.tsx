import type { AppRole } from '@hmj/shared';
import { useTheme } from '@hmj/ui';
import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { homeHref } from '@/lib/routes';

/** Wraps a role's area: signed out → welcome, not onboarded → onboarding, wrong role → their own home. */
export function RoleGate({ role, children }: { role: AppRole; children: ReactNode }) {
  const { loading, session, profile } = useAuth();
  const { t } = useTheme();

  if (loading || (session && !profile)) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }
  if (!session || !profile) return <Redirect href="/welcome" />;
  if (profile.role !== role || (role !== 'admin' && !profile.onboarded_at)) return <Redirect href={homeHref(profile)} />;
  return <>{children}</>;
}
