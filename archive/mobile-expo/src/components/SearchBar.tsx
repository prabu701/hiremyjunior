import { FONTS, Icon, Text, useTheme } from '@hmj/ui';
import { Pressable, TextInput, View } from 'react-native';

/** Prototype search pill. Editable when onChangeText is given, otherwise a button (e.g. → Search tab). */
export function SearchBar({ value, onChangeText, onPress, placeholder, autoFocus }: {
  value?: string;
  onChangeText?: (v: string) => void;
  onPress?: () => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  const { t, radius } = useTheme();
  const box = {
    flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: t.card,
    borderRadius: radius.card ? 16 : 0, paddingVertical: 13, paddingHorizontal: 16, boxShadow: `0 4px 14px ${t.shadow}`,
  };
  if (!onChangeText) {
    return (
      <Pressable onPress={onPress} accessibilityRole="search" style={box}>
        <Icon name="search" size={18} color={t.muted} />
        <Text style={{ fontSize: 14 }} muted>{placeholder}</Text>
      </Pressable>
    );
  }
  return (
    <View style={box}>
      <Icon name="search" size={18} color={t.muted} />
      <TextInput
        testID="search-input"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.muted}
        autoFocus={autoFocus}
        returnKeyType="search"
        accessibilityLabel={placeholder}
        style={[{ flex: 1, fontSize: 14, fontFamily: FONTS.body, color: t.text, padding: 0 }, { outlineStyle: 'none' } as object]}
      />
    </View>
  );
}
