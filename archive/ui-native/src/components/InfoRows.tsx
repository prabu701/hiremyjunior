import { Fragment } from 'react';
import { View } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { FONTS } from '../themes';
import { Text } from './Text';

/** Label/value rows separated by hairlines (prototype "Hourly Rate / Availability" card). */
export function InfoRows({ rows }: { rows: { label: string; value: string; accent?: boolean }[] }) {
  const { t, radius } = useTheme();
  return (
    <View style={{ backgroundColor: t.card, borderRadius: radius.card, padding: 16, gap: 8 }}>
      {rows.map((r, i) => (
        <Fragment key={r.label}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: t.navBorder }} /> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ fontSize: 13 }} muted>{r.label}</Text>
            <Text style={{ fontFamily: r.accent ? FONTS.bodyBold : FONTS.bodySemi, fontSize: 13.5, flexShrink: 1, textAlign: 'right' }} color={r.accent ? t.accent : undefined}>
              {r.value}
            </Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

/** Three-up stat tiles (prototype profile: Jobs Done / Rating / Location). */
export function StatTiles({ stats }: { stats: { label: string; value: string }[] }) {
  const { t, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {stats.map((s) => (
        <View key={s.label} style={{ flex: 1, backgroundColor: t.card, borderRadius: radius.card, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', gap: 2 }}>
          <Text style={{ fontFamily: FONTS.displayBold, fontSize: s.value.length > 6 ? 14 : 18, textAlign: 'center' }}>{s.value}</Text>
          <Text style={{ fontSize: 11 }} muted>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Small status pill. */
export function Badge({ label, tone = 1 }: { label: string; tone?: 1 | 2 | 3 }) {
  const { t, radius } = useTheme();
  const bg = tone === 1 ? t.tint1 : tone === 2 ? t.tint2 : t.tint3;
  const fg = tone === 1 ? t.tint1c : tone === 2 ? t.tint2c : t.tint3c;
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.chip, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 11.5, fontFamily: FONTS.bodySemi }} color={fg}>{label}</Text>
    </View>
  );
}
