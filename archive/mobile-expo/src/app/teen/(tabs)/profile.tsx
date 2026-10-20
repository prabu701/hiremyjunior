import { Avatar, Button, ChipGroup, InfoRows, Screen, StatTiles, Text, useTheme } from '@hmj/ui';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { GuardianList } from '@/components/GuardianList';
import { SignOutButton } from '@/components/SignOutButton';
import { useAuth } from '@/lib/auth';
import { rateRange } from '@/lib/format';
import { useMySkills } from '@/lib/jobs';
import { useMyJunior } from '@/lib/queries';

function shortName(full: string | null | undefined) {
  if (!full) return '';
  const [first, ...rest] = full.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1]![0]}.` : first!;
}

/** Prototype "Teen — Profile". Skills, rates and ratings arrive with Phase 4 and later. */
export default function TeenProfile() {
  const { profile } = useAuth();
  const { t } = useTheme();
  const junior = useMyJunior();
  const skills = useMySkills();
  const j = junior.data;
  const skillChips = (skills.data ?? [])
    .map((s) => ({ value: s.skill_id, label: s.skills?.name ?? s.skill_id, sort: s.skills?.sort ?? 0 }))
    .sort((a, b) => a.sort - b.sort);

  return (
    <Screen compactTop>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="title" style={{ fontSize: 19 }}>My Profile</Text>
        <Pressable onPress={() => router.push('/onboarding')} accessibilityRole="button" hitSlop={8}>
          <Text style={{ fontSize: 13, fontWeight: '600' }} color={t.accent}>Edit</Text>
        </Pressable>
      </View>
      <View style={{ alignItems: 'center', gap: 10 }}>
        <Avatar name={profile?.full_name} size={84} />
        <View style={{ alignItems: 'center', gap: 3 }}>
          <Text variant="title" style={{ fontSize: 19 }}>{shortName(profile?.full_name)}</Text>
          <Text variant="caption">{j?.school_name}</Text>
        </View>
      </View>
      <StatTiles stats={[{ label: 'Jobs Done', value: '0' }, { label: 'Rating', value: '—' }, { label: 'Location', value: j?.city ?? '—' }]} />
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="heading" style={{ fontSize: 15 }}>Skills</Text>
          <Pressable onPress={() => router.push('/teen/work-profile')} accessibilityRole="button" hitSlop={8}>
            <Text style={{ fontSize: 13, fontWeight: '600' }} color={t.accent}>Edit work profile</Text>
          </Pressable>
        </View>
        {skillChips.length ? <ChipGroup options={skillChips} values={skillChips.map((c) => c.value)} /> : <Text variant="caption">Add skills so employers can find you.</Text>}
      </View>
      <InfoRows
        rows={[
          { label: 'Hourly Rate', value: rateRange(j?.rate_min_cents, j?.rate_max_cents), accent: true },
          { label: 'Availability', value: j?.availability ?? 'Not set' },
          { label: 'Visible to employers', value: j?.discoverable === false ? 'Hidden' : 'Yes' },
          { label: 'Status', value: profile?.status === 'active' ? 'Verified' : 'Setup in progress' },
        ]}
      />

      <View style={{ gap: 10 }}>
        <Text variant="heading" style={{ fontSize: 15 }}>Parents & guardians</Text>
        <GuardianList emptyText="No parent linked yet." />
        <Button testID="link-parent" label="Link a parent or guardian" variant="secondary" onPress={() => router.push('/teen/link-parent')} />
      </View>
      <SignOutButton />
    </Screen>
  );
}
