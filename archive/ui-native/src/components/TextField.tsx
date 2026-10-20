import { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { FONTS } from '../themes';
import { Text } from './Text';

/** Underlined field from the prototype's sign-up forms. */
export const TextField = forwardRef<TextInput, TextInputProps & { label: string; error?: string | null }>(function TextField(
  { label, error, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { t } = useTheme();
  const [focused, setFocused] = useState(false);
  const underline = error ? t.danger : focused ? t.accent : t.tint1;

  return (
    <View style={{ gap: 6 }}>
      <Text variant="label">{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={t.muted}
        accessibilityLabel={label}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          {
            borderBottomWidth: 2,
            borderBottomColor: underline,
            paddingVertical: 10,
            paddingHorizontal: 2,
            fontSize: 15,
            fontFamily: FONTS.body,
            color: t.text,
            outlineStyle: 'none',
          } as object,
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color={t.danger} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
});
