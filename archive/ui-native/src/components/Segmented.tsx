import { Pressable, View } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { FONTS } from '../themes';
import { Text } from './Text';

/** Two-to-four option toggle styled like the prototype's "Corner style" picker. */
export function Segmented<T extends string>({ options, value, onChange, testIDPrefix }: {
  options: { value: T; label: string; hint?: string }[];
  value: T | null;
  onChange: (v: T) => void;
  testIDPrefix?: string;
}) {
  const { t, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 10 }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            testID={testIDPrefix ? `${testIDPrefix}-${o.value}` : undefined}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={{ flex: 1, backgroundColor: t.card, borderWidth: 2, borderColor: selected ? t.accent : t.navBorder, borderRadius: radius.tile, padding: 14, gap: 4 }}
          >
            <Text style={{ fontFamily: FONTS.display, fontSize: 14.5 }}>{o.label}</Text>
            {o.hint ? <Text style={{ fontSize: 11.5, lineHeight: 16 }} muted>{o.hint}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
