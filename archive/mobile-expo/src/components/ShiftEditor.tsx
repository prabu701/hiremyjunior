import { Button, Icon, Text, TextField, useTheme } from '@hmj/ui';
import { Pressable, View } from 'react-native';
import { DateField } from './DateField';

export interface ShiftDraft {
  key: string;
  date: string; // MM/DD/YYYY
  start: string; // free text e.g. "9am"
  end: string;
}

let n = 0;
export const newShift = (): ShiftDraft => ({ key: `s${n++}`, date: '', start: '', end: '' });

/** Rows of date + start + end, in WA local time. */
export function ShiftEditor({ shifts, onChange }: { shifts: ShiftDraft[]; onChange: (s: ShiftDraft[]) => void }) {
  const { t } = useTheme();
  const update = (key: string, patch: Partial<ShiftDraft>) => onChange(shifts.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  return (
    <View style={{ gap: 14 }}>
      {shifts.map((s, i) => (
        <View key={s.key} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="label">{`Shift ${i + 1}`}</Text>
            {shifts.length > 1 ? (
              <Pressable onPress={() => onChange(shifts.filter((x) => x.key !== s.key))} accessibilityRole="button" accessibilityLabel={`Remove shift ${i + 1}`} hitSlop={8}>
                <Icon name="x" size={16} color={t.muted} />
              </Pressable>
            ) : null}
          </View>
          <DateField testID={`shift-${i}-date`} label="Date" value={s.date} onChange={(v) => update(s.key, { date: v })} />
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}><TextField testID={`shift-${i}-start`} label="Start" value={s.start} onChangeText={(v) => update(s.key, { start: v })} placeholder="9:00 AM" /></View>
            <View style={{ flex: 1 }}><TextField testID={`shift-${i}-end`} label="End" value={s.end} onChangeText={(v) => update(s.key, { end: v })} placeholder="11:00 AM" /></View>
          </View>
        </View>
      ))}
      <Button label="Add another date" variant="ghost" onPress={() => onChange([...shifts, newShift()])} />
    </View>
  );
}
