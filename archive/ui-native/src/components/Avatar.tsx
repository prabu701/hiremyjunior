import { View } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { FONTS } from '../themes';
import { Text } from './Text';

/** Initial-in-a-circle avatar. Always round, as in the prototype, regardless of corner style. */
export function Avatar({ name, size = 44, tone }: { name: string | null | undefined; size?: number; tone?: 1 | 2 | 3 }) {
  const { t } = useTheme();
  const bg = tone === 2 ? t.tint2 : tone === 3 ? t.tint3 : tone === 1 ? t.tint1 : t.avatarBg;
  const fg = tone === 2 ? t.tint2c : tone === 3 ? t.tint3c : tone === 1 ? t.tint1c : t.avatarText;
  const initial = (name?.trim()[0] ?? '?').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: 999, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: FONTS.display, fontSize: size * 0.38 }} color={fg}>{initial}</Text>
    </View>
  );
}

/** Square monogram tile used on job cards (tile radius follows corner style). */
export function Monogram({ label, tone, size = 52 }: { label: string; tone: 1 | 2 | 3; size?: number }) {
  const { t, radius } = useTheme();
  const bg = tone === 1 ? t.tint1 : tone === 2 ? t.tint2 : t.tint3;
  const fg = tone === 1 ? t.tint1c : tone === 2 ? t.tint2c : t.tint3c;
  return (
    <View style={{ width: size, height: size, borderRadius: radius.tile, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: FONTS.display, fontSize: 18 }} color={fg}>{(label[0] ?? '?').toUpperCase()}</Text>
    </View>
  );
}

/** Stable tint for an arbitrary string, so the same employer/job always gets the same colour. */
export function toneFor(key: string): 1 | 2 | 3 {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return ((h % 3) + 1) as 1 | 2 | 3;
}
