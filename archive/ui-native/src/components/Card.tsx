import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';

/** Surface with the prototype's soft shadow. Pressable when onPress is given. */
export function Card({ children, onPress, style, padding = 16, testID, accessibilityLabel }: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  padding?: number;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const { t, radius } = useTheme();
  const base: ViewStyle = { backgroundColor: t.card, borderRadius: radius.card, padding, boxShadow: `0 3px 12px ${t.shadow}` } as ViewStyle;
  if (!onPress) return <View testID={testID} style={[base, style]}>{children}</View>;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, style, { opacity: pressed ? 0.85 : 1 }]}
    >
      {children}
    </Pressable>
  );
}
