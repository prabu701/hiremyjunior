import { useTheme } from '@hmj/ui';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { homeHref } from '@/lib/routes';

/** Entry gate: signed-in users go to their role's home, everyone else picks a role. */
export default function Index() {
  const { loading, session, profile } = useAuth();
  const { t } = useTheme();

  if (loading || (session && !profile)) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.accent} />
      </View>
    );
  }
  return <Redirect href={session && profile ? homeHref(profile) : '/welcome'} />;
}
