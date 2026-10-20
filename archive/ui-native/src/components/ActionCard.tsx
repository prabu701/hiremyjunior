import { Pressable, View } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** Card with a tinted icon tile, title, subtitle and chevron (prototype role-select rows). */
export function ActionCard({
  icon,
  tone,
  title,
  subtitle,
  onPress,
  testID,
}: {
  icon: IconName;
  tone: 1 | 2 | 3;
  title: string;
  subtitle: string;
  onPress: () => void;
  testID?: string;
}) {
  const { t, radius } = useTheme();
  const tileBg = tone === 1 ? t.tint1 : tone === 2 ? t.tint2 : t.tint3;
  const tileFg = tone === 1 ? t.tint1c : tone === 2 ? t.tint2c : t.tint3c;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => ({
        backgroundColor: t.card,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderRadius: radius.card,
        boxShadow: `0 3px 12px ${t.shadow}`,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ width: 52, height: 52, backgroundColor: tileBg, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={24} color={tileFg} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="heading">{title}</Text>
        <Text variant="caption">{subtitle}</Text>
      </View>
      <Icon name="chevronRight" size={18} color={t.muted} />
    </Pressable>
  );
}
