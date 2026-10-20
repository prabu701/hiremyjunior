import { Badge, Card, Icon, Text, useTheme } from '@hmj/ui';
import { router, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useRequirements } from '@/lib/queries';

// Where each requirement key is completed. Keys come from public.requirements_for().
const ACTIONS: Record<string, Href> = {
  profile: '/onboarding',
  guardian: '/teen/link-parent',
  teen: '/parent/invite',
  phone: '/verify-phone',
  identity: '/verify-identity',
  proof_of_age: '/teen/proof-of-age',
  background_check: '/employer/background-check',
  business_registration: '/employer/business',
  work_permit: '/employer/business',
  supervisor_check: '/employer/background-check',
};

/** "Finish setting up" card. Hidden once every blocking item is done (unless `always`). */
export function SetupChecklist({ title = 'Finish setting up', always = false }: { title?: string; always?: boolean }) {
  const { t, radius } = useTheme();
  const { data, isLoading } = useRequirements();

  if (isLoading) return <ActivityIndicator color={t.accent} />;
  if (!data) return null;
  const blockingLeft = data.filter((r) => r.blocking && !r.done).length;
  if (!always && data.every((r) => r.done)) return null;

  return (
    <Card testID="setup-checklist" padding={18} style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="heading">{title}</Text>
        {blockingLeft > 0 ? <Badge label={`${blockingLeft} to go`} /> : <Badge label="Ready" tone={3} />}
      </View>
      {data.map((r, i) => {
        const href = ACTIONS[r.key];
        const row = (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 26, height: 26, borderRadius: radius.chip,
                backgroundColor: r.done ? t.accent : 'transparent',
                borderWidth: r.done ? 0 : 2, borderColor: t.navBorder,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {r.done ? <Icon name="check" size={14} color={t.onAccent} strokeWidth={3} /> : <Text style={{ fontSize: 11 }} muted>{i + 1}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14 }} color={r.done ? t.muted : t.text}>{r.label}</Text>
              {!r.blocking && !r.done ? <Text variant="caption">Optional for now</Text> : null}
            </View>
            {!r.done && href ? <Icon name="chevronRight" size={18} color={t.muted} /> : null}
          </View>
        );
        return !r.done && href ? (
          <Pressable key={r.key} testID={`req-${r.key}`} onPress={() => router.push(href)} accessibilityRole="button" accessibilityLabel={r.label}>
            {row}
          </Pressable>
        ) : (
          <View key={r.key}>{row}</View>
        );
      })}
    </Card>
  );
}
