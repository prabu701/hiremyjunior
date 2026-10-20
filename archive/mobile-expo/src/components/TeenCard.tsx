import { Avatar, Card, FONTS, Icon, Text, toneFor, useTheme } from '@hmj/ui';
import { View } from 'react-native';
import { rateRange } from '@/lib/format';

/** Prototype "Find Teens Nearby" row. */
export function TeenCard({ teen, onPress }: {
  teen: { id: string; display_name: string | null; age_band: string | null; distance_mi: number | null; skill_names: string[]; rate_min_cents: number | null; rate_max_cents: number | null };
  onPress: () => void;
}) {
  const { t } = useTheme();
  return (
    <Card testID={`teen-${teen.id}`} onPress={onPress} padding={14} style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }} accessibilityLabel={teen.display_name ?? 'Teen'}>
      <Avatar name={teen.display_name} size={52} tone={toneFor(teen.id)} />
      <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
        <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14.5 }}>{teen.display_name}</Text>
        <Text style={{ fontSize: 12.5 }} muted numberOfLines={1}>{teen.skill_names.slice(0, 2).join(' · ') || 'No skills listed'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="mapPin" size={12} color={t.muted} />
          <Text style={{ fontSize: 12 }} muted>{`${teen.distance_mi ?? '—'} mi · age ${teen.age_band ?? '—'}`}</Text>
        </View>
      </View>
      <Text style={{ fontFamily: FONTS.display, fontSize: 14 }} color={t.accent}>{rateRange(teen.rate_min_cents, teen.rate_max_cents)}</Text>
    </Card>
  );
}
