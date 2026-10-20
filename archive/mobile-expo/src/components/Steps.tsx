import { FONTS, Icon, Text, useTheme } from '@hmj/ui';
import { View } from 'react-native';
import type { Step } from '@/lib/bookings';

/** Prototype numbered tracker (Application Sent / Hire Request / Job Tracker). */
export function Steps({ steps }: { steps: Step[] }) {
  const { t } = useTheme();
  return (
    <View>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const done = s.status === 'done';
        const active = s.status === 'active';
        const stopped = s.status === 'stopped';
        return (
          <View key={s.title} style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: done ? t.accent : active ? t.tint1 : 'transparent',
                  borderWidth: done ? 0 : 2, borderColor: stopped ? t.danger : active ? t.accent : t.navBorder,
                }}
              >
                {done ? <Icon name="check" size={15} color={t.onAccent} strokeWidth={3} /> : stopped ? <Icon name="x" size={14} color={t.danger} strokeWidth={3} /> : (
                  <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 12 }} color={active ? t.accent : t.muted}>{i + 1}</Text>
                )}
              </View>
              {!last ? <View style={{ width: 2, flex: 1, minHeight: 22, backgroundColor: done ? t.accent : t.navBorder }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : 18, gap: 2, paddingTop: 4 }}>
              <Text style={{ fontFamily: FONTS.bodySemi, fontSize: 14 }} color={done || active ? t.text : stopped ? t.danger : t.muted}>{s.title}</Text>
              <Text style={{ fontSize: 12.5 }} muted>{s.subtitle}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
