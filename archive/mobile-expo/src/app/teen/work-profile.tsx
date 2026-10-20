import { Button, ChipGroup, Notice, Screen, Segmented, Text, TextField, useTheme } from '@hmj/ui';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { Junior } from '@hmj/shared';
import { useMySkills, useSkills } from '@/lib/jobs';
import { queryClient, useMyJunior } from '@/lib/queries';
import { errorMessage, rpc } from '@/lib/rpc';

const toCents = (v: string) => (v.trim() ? Math.round(Number(v.replace(/[^0-9.]/g, '')) * 100) : null);
const fromCents = (c: number | null | undefined) => (c == null ? '' : String(c / 100));

export default function WorkProfile() {
  const junior = useMyJunior();
  const mine = useMySkills();
  if (junior.isLoading || mine.isLoading || !junior.data) return <Screen><ActivityIndicator /></Screen>;
  return <WorkProfileForm initial={junior.data} initialSkills={(mine.data ?? []).map((s) => s.skill_id)} />;
}

function WorkProfileForm({ initial, initialSkills }: { initial: Junior; initialSkills: string[] }) {
  const { t } = useTheme();
  const skills = useSkills();
  const [bio, setBio] = useState(initial.bio ?? '');
  const [min, setMin] = useState(fromCents(initial.rate_min_cents));
  const [max, setMax] = useState(fromCents(initial.rate_max_cents));
  const [availability, setAvailability] = useState(initial.availability ?? '');
  const [selected, setSelected] = useState<string[]>(initialSkills);
  const [radiusMi, setRadiusMi] = useState(String(initial.search_radius_mi));
  const [discoverable, setDiscoverable] = useState(initial.discoverable);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/teen/profile'));

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await rpc('save_junior_work_profile', {
        bio, rate_min_cents: toCents(min) as number, rate_max_cents: toCents(max) as number, availability,
        skills: selected, search_radius_mi: Number(radiusMi), discoverable,
      });
      await Promise.all(['junior', 'my-skills', 'job-search'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })));
      back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen onBack={back} headerLabel="Work profile" footer={<Button testID="save-work-profile" label="Save" onPress={save} loading={saving} />}>
      <Text variant="title" accessibilityRole="header">What can you do?</Text>
      <View style={{ gap: 10 }}>
        <Text variant="label">Skills (up to 8)</Text>
        <ChipGroup
          options={(skills.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
          values={selected}
          onToggle={(id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 8 ? cur : [...cur, id]))}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1 }}><TextField testID="rate-min" label="Rate from ($/hr)" value={min} onChangeText={setMin} placeholder="18" keyboardType="decimal-pad" /></View>
        <View style={{ flex: 1 }}><TextField testID="rate-max" label="Up to ($/hr)" value={max} onChangeText={setMax} placeholder="25" keyboardType="decimal-pad" /></View>
      </View>
      <TextField testID="availability" label="Availability" value={availability} onChangeText={setAvailability} placeholder="Weekends + evenings" maxLength={80} />
      <TextField testID="bio" label="About you" value={bio} onChangeText={setBio} placeholder="What you're great at, experience with pets or kids…" multiline maxLength={500} style={{ minHeight: 70 }} />
      <View style={{ gap: 10 }}>
        <Text variant="label">Show me jobs within</Text>
        <Segmented value={radiusMi} onChange={setRadiusMi} options={['2', '5', '10', '25'].map((r) => ({ value: r, label: `${r} mi` }))} />
      </View>
      <Pressable
        testID="discoverable"
        onPress={() => setDiscoverable((v) => !v)}
        accessibilityRole="switch"
        accessibilityState={{ checked: discoverable }}
        style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}
      >
        <View style={{ width: 44, height: 26, borderRadius: 999, backgroundColor: discoverable ? t.accent : t.navBorder, padding: 3, alignItems: discoverable ? 'flex-end' : 'flex-start' }}>
          <View style={{ width: 20, height: 20, borderRadius: 999, backgroundColor: '#fff' }} />
        </View>
        <Text style={{ flex: 1, fontSize: 13.5 }}>Let verified employers find me and send hire requests</Text>
      </Pressable>
      <Notice tone={2} icon="shield">Employers only see your first name and last initial, your age range (14–15 or 16–17), skills, rate and rough distance.</Notice>
      {error ? <Notice icon="alert">{error}</Notice> : null}
    </Screen>
  );
}
