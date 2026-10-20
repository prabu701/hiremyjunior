import { Screen, SWATCHES, Text, useTheme, Icon, RADII, type CornerStyle } from '@hmj/ui';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

/** Prototype screen "Appearance / Theme Picker" — both controls are live here. */
export default function Appearance() {
  const { t, themeKey, corners, setTheme, setCorners } = useTheme();

  return (
    <Screen onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} headerTitle="Appearance">
      <Text muted style={{ fontSize: 13 }}>
        Pick a look for your app. You can switch anytime.
      </Text>

      <View style={{ gap: 12 }} accessibilityRole="radiogroup">
        {SWATCHES.map((sw) => {
          const selected = sw.key === themeKey;
          return (
            <Pressable
              key={sw.key}
              testID={`theme-${sw.key}`}
              onPress={() => setTheme(sw.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${sw.name}. ${sw.desc}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                backgroundColor: selected ? t.card : 'transparent',
                borderWidth: 2,
                borderColor: selected ? t.accent : t.navBorder,
                borderRadius: 16,
                padding: 14,
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12, overflow: 'hidden', flexDirection: 'row' }}>
                <View style={{ flex: 1, backgroundColor: sw.bg }} />
                <View style={{ flex: 1, backgroundColor: sw.accent }} />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text variant="heading" style={{ fontSize: 14.5 }}>
                  {sw.name}
                </Text>
                <Text style={{ fontSize: 11.5 }} muted>
                  {sw.desc}
                </Text>
              </View>
              {selected ? <Icon name="check" size={20} color={t.accent} strokeWidth={2.5} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 10 }}>
        <Text variant="heading" style={{ fontSize: 14.5 }}>
          Corner style
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }} accessibilityRole="radiogroup">
          {(['sharp', 'rounded'] as CornerStyle[]).map((style) => {
            const selected = style === corners;
            return (
              <Pressable
                key={style}
                testID={`corners-${style}`}
                onPress={() => setCorners(style)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={{
                  flex: 1,
                  backgroundColor: t.card,
                  borderWidth: 2,
                  borderColor: selected ? t.accent : t.navBorder,
                  borderRadius: 14,
                  padding: 14,
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <View style={{ width: 36, height: 20, backgroundColor: selected ? t.accent : t.navBorder, borderRadius: RADII[style].button }} />
                <Text style={{ fontSize: 12, fontWeight: '600' }} muted={!selected}>
                  {style === 'sharp' ? 'Sharp' : 'Rounded'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}
