import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeProvider';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * Full-height page matching the prototype's 390px frame: optional back header, scrolling body,
 * and a pinned footer for the primary action. Capped at 480px wide so it stays phone-shaped on web.
 */
export function Screen({
  children,
  footer,
  onBack,
  headerLabel,
  headerTitle,
  gap = 22,
  headerRight,
  compactTop = false,
}: {
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  headerLabel?: string;
  headerTitle?: string;
  gap?: number;
  headerRight?: ReactNode;
  /** Tab pages sit closer to the top than the prototype's standalone screens. */
  compactTop?: boolean;
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const hasHeader = Boolean(onBack || headerLabel || headerTitle);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 480, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        {hasHeader && (
          <View style={{ paddingTop: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {onBack && (
              <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}>
                <Icon name="chevronLeft" size={22} color={t.text} strokeWidth={2.2} />
              </Pressable>
            )}
            {headerTitle ? <Text variant="heading" style={{ fontSize: 18 }}>{headerTitle}</Text> : null}
            {headerLabel ? <Text variant="caption">{headerLabel}</Text> : null}
            {headerRight ? <View style={{ marginLeft: 'auto' }}>{headerRight}</View> : null}
          </View>
        )}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: hasHeader ? 20 : compactTop ? 22 : 60, paddingHorizontal: 24, paddingBottom: 24, gap }}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
        {footer ? <View style={{ paddingTop: 16, paddingHorizontal: 24, paddingBottom: 22, gap: 10 }}>{footer}</View> : null}
      </View>
    </View>
  );
}
