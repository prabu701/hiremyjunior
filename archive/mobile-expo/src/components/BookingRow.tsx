import type { BookingState } from '@hmj/booking';
import { Badge, Card, FONTS, Monogram, Text, toneFor, useTheme } from '@hmj/ui';
import { View } from 'react-native';
import { stateLabel, stateTone } from '@/lib/bookings';
import { dayLabel, rate } from '@/lib/format';

export function BookingRow({ b, title, subtitle, onPress }: {
  b: { id: string; state: BookingState; job_title: string; rate_cents: number; pay_type: 'hourly' | 'fixed'; next_shift_at: string | null; needs_action: boolean };
  title?: string;
  subtitle: string;
  onPress: () => void;
}) {
  const { t } = useTheme();
  return (
    <Card testID={`booking-${b.id}`} onPress={onPress} padding={14} style={{ gap: 10, borderWidth: b.needs_action ? 2 : 0, borderColor: t.accent }} accessibilityLabel={`${b.job_title}, ${stateLabel(b.state)}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Monogram label={b.job_title} tone={toneFor(b.id)} size={44} />
        <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
          <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 14.5 }} numberOfLines={1}>{title ?? b.job_title}</Text>
          <Text style={{ fontSize: 12.5 }} muted numberOfLines={1}>{subtitle}</Text>
        </View>
        <Text style={{ fontFamily: FONTS.display, fontSize: 14 }} color={t.accent}>{rate(b.rate_cents, b.pay_type)}</Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Badge label={b.needs_action ? 'Your move' : stateLabel(b.state)} tone={b.needs_action ? 1 : stateTone(b.state)} />
        {b.next_shift_at ? <Text variant="caption">{`Next: ${dayLabel(b.next_shift_at)}`}</Text> : null}
      </View>
    </Card>
  );
}
