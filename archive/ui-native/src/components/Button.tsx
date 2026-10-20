import { ActivityIndicator, Pressable } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { FONTS } from '../themes';
import { Text } from './Text';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const { t, radius } = useTheme();
  const inactive = disabled || loading;
  const bg = variant === 'primary' ? t.accent : variant === 'secondary' ? t.card : 'transparent';
  const fg = variant === 'primary' ? t.onAccent : variant === 'secondary' ? t.text : t.muted;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderRadius: radius.button,
        padding: 16,
        alignItems: 'center',
        opacity: inactive ? 0.55 : pressed ? 0.85 : 1,
        borderWidth: variant === 'secondary' ? 2 : 0,
        borderColor: t.navBorder,
      })}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ fontFamily: FONTS.display, fontSize: 15.5 }} color={fg}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
