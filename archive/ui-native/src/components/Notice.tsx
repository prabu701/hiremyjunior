import { View } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** Tinted info banner (prototype: "We'll text a code to your parent…"). */
export function Notice({ children, tone = 1, icon = 'info' }: { children: string; tone?: 1 | 2 | 3; icon?: IconName }) {
  const { t, radius } = useTheme();
  const bg = tone === 1 ? t.tint1 : tone === 2 ? t.tint2 : t.tint3;
  const fg = tone === 1 ? t.tint1c : tone === 2 ? t.tint2c : t.tint3c;
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: bg, padding: 14, borderRadius: radius.tile }}>
      <View style={{ marginTop: 1 }}>
        <Icon name={icon} size={17} color={fg} />
      </View>
      <Text style={{ flex: 1, fontSize: 12, lineHeight: 18 }} color={fg}>
        {children}
      </Text>
    </View>
  );
}
