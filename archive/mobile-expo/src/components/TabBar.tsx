import { Icon, Text, useTheme, FONTS, type IconName } from '@hmj/ui';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ICONS: Record<string, IconName> = { index: 'home', search: 'search', jobs: 'calendar', profile: 'user', teens: 'users', approvals: 'check', post: 'plus', applicants: 'users' };

/** Bottom navigation from the prototype home feed. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: t.navBg, borderTopWidth: 1, borderTopColor: t.navBorder, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', maxWidth: 480, paddingTop: 14, paddingBottom: 18 + insets.bottom }}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key]!;
          const label = typeof options.title === 'string' ? options.title : route.name;
          const color = focused ? t.accent : t.navInactive;
          const badge = options.tabBarBadge;
          return (
            <Pressable
              key={route.key}
              testID={`tab-${route.name}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={{ alignItems: 'center', gap: 3, minWidth: 64 }}
            >
              <View>
                <Icon name={ICONS[route.name] ?? 'home'} size={22} color={color} />
                {badge ? (
                  <View style={{ position: 'absolute', top: -4, right: -10, backgroundColor: t.accent, borderRadius: 999, minWidth: 16, height: 16, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 10, fontFamily: FONTS.bodyBold }} color={t.onAccent}>{String(badge)}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ fontSize: 11, fontFamily: focused ? FONTS.bodySemi : FONTS.body }} color={color}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
