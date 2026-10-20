import { Pressable, ScrollView, View } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { FONTS } from '../themes';
import { Text } from './Text';

export function Chip({ label, selected = false, onPress, testID }: { label: string; selected?: boolean; onPress?: () => void; testID?: string }) {
  const { t, radius } = useTheme();
  const content = (
    <Text style={{ fontFamily: FONTS.bodySemi, fontSize: 13 }} color={selected ? t.chipActiveText : t.chipText}>
      {label}
    </Text>
  );
  const style = { paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.chip, backgroundColor: selected ? t.chipActiveBg : t.chipBg };
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: selected }} style={style}>
      {content}
    </Pressable>
  );
}

/** Horizontal filter row (single-select), prototype home feed. */
export function ChipRow<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </ScrollView>
  );
}

/** Wrapping multi-select, prototype profile skills. */
export function ChipGroup<T extends string>({ options, values, onToggle }: { options: { value: T; label: string }[]; values: T[]; onToggle?: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => (
        <Chip key={o.value} testID={`chip-${o.value}`} label={o.label} selected={values.includes(o.value)} onPress={onToggle ? () => onToggle(o.value) : undefined} />
      ))}
    </View>
  );
}
