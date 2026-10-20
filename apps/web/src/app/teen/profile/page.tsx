'use client';
import type { Junior } from '@hmj/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { GuardianList } from '@/components/app/GuardianList';
import { Alert } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChipGroup } from '@/components/ui/Chip';
import { Input, Textarea } from '@/components/ui/Field';
import { EmptyState, KeyValues, PageHeader, SectionTitle, Segmented, Stat, Switch } from '@/components/ui/Misc';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/lib/auth';
import { rateRange } from '@/lib/format';
import { useMySkills, useSkills } from '@/lib/jobs';
import { useMyJunior } from '@/lib/queries';
import { errorMessage, rpc } from '@/lib/rpc';

const toCents = (v: string) => (v.trim() ? Math.round(Number(v.replace(/[^0-9.]/g, '')) * 100) : null);
const fromCents = (c: number | null | undefined) => (c == null ? '' : String(c / 100));

export default function TeenProfile() {
  const { profile } = useAuth();
  const junior = useMyJunior();
  const mine = useMySkills();
  const [editing, setEditing] = useState(false);
  if (junior.isLoading || mine.isLoading || !junior.data) return <PageSpinner />;
  const j = junior.data;
  const skills = (mine.data ?? []).map((s) => ({ id: s.skill_id, name: s.skills?.name ?? s.skill_id, sort: s.skills?.sort ?? 0 })).sort((a, b) => a.sort - b.sort);
  const [first, ...rest] = (profile?.full_name ?? '').split(' ');
  const shortName = rest.length ? `${first} ${rest[rest.length - 1]![0]}.` : first;

  return (
    <div className="space-y-10">
      <PageHeader title="Profile" subtitle="What employers see when they find you." actions={<ButtonLink href="/onboarding" variant="secondary" icon={<Pencil className="size-4" />}>Edit details</ButtonLink>} />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="flex flex-col items-center p-8 text-center">
          <Avatar name={profile?.full_name} size={96} />
          <h2 className="mt-4 text-2xl text-ink">{shortName}</h2>
          <p className="text-[14px] text-muted">{j.school_name}</p>
          <p className="mt-1 text-[13px] text-muted">{j.city}</p>
          <div className="mt-6 grid w-full grid-cols-2 gap-3">
            <Stat label="Jobs done" value="0" />
            <Stat label="Rating" value="—" />
          </div>
        </Card>

        {editing ? (
          <WorkProfileForm initial={j} initialSkills={skills.map((s) => s.id)} onDone={() => setEditing(false)} />
        ) : (
          <Card className="space-y-6 p-6 sm:p-8">
            <SectionTitle action={<Button variant="soft" size="sm" onClick={() => setEditing(true)} data-testid="edit-work-profile">Edit work profile</Button>}>Work profile</SectionTitle>
            {j.bio ? <p className="text-[15px] leading-relaxed text-ink/85">{j.bio}</p> : <p className="text-[14px] text-muted">Add a short intro so employers know what you’re great at.</p>}
            <div>
              <p className="mb-2.5 text-[13px] font-semibold text-muted">Skills</p>
              {skills.length ? <ChipGroup options={skills.map((s) => ({ value: s.id, label: s.name }))} values={[]} /> : <p className="text-[14px] text-muted">No skills yet.</p>}
            </div>
            <KeyValues
              rows={[
                { label: 'Hourly rate', value: rateRange(j.rate_min_cents, j.rate_max_cents), accent: true },
                { label: 'Availability', value: j.availability ?? 'Not set' },
                { label: 'Job search radius', value: `${j.search_radius_mi} miles` },
                { label: 'Visible to employers', value: j.discoverable ? 'Yes' : 'Hidden' },
              ]}
            />
          </Card>
        )}
      </div>

      <section className="space-y-4">
        <SectionTitle action={<ButtonLink href="/teen/link-parent" variant="ghost" size="sm" icon={<UserPlus className="size-4" />}>Link another</ButtonLink>}>Parents &amp; guardians</SectionTitle>
        <GuardianList empty={<EmptyState icon={<UserPlus className="size-6" />} title="No parent linked yet" action={<ButtonLink href="/teen/link-parent">Link a parent</ButtonLink>}>Ask your parent for their invite code.</EmptyState>} />
      </section>
    </div>
  );
}

function WorkProfileForm({ initial, initialSkills, onDone }: { initial: Junior; initialSkills: string[]; onDone: () => void }) {
  const qc = useQueryClient();
  const skills = useSkills();
  const [bio, setBio] = useState(initial.bio ?? '');
  const [min, setMin] = useState(fromCents(initial.rate_min_cents));
  const [max, setMax] = useState(fromCents(initial.rate_max_cents));
  const [availability, setAvailability] = useState(initial.availability ?? '');
  const [selected, setSelected] = useState<string[]>(initialSkills);
  const [radius, setRadius] = useState(String(initial.search_radius_mi));
  const [discoverable, setDiscoverable] = useState(initial.discoverable);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      await rpc('save_junior_work_profile', {
        bio, rate_min_cents: toCents(min) as number, rate_max_cents: toCents(max) as number, availability,
        skills: selected, search_radius_mi: Number(radius), discoverable,
      });
      await Promise.all(['junior', 'my-skills', 'job-search'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
      onDone();
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-6 p-6 sm:p-8">
      <SectionTitle>Edit work profile</SectionTitle>
      <div>
        <p className="mb-2.5 text-[13px] font-semibold text-ink/80">Skills <span className="font-normal text-muted">(up to 8)</span></p>
        <ChipGroup
          label="Skills"
          options={(skills.data ?? []).map((s) => ({ value: s.id, label: s.name }))}
          values={selected}
          onToggle={(id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 8 ? cur : [...cur, id]))}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Input label="Rate from ($/hr)" value={min} onChange={(e) => setMin(e.target.value)} placeholder="18" inputMode="decimal" />
        <Input label="Up to ($/hr)" value={max} onChange={(e) => setMax(e.target.value)} placeholder="25" inputMode="decimal" />
        <Input label="Availability" value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Weekends + evenings" maxLength={80} />
      </div>
      <Textarea label="About you" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What you’re great at, experience with pets or kids…" maxLength={500} />
      <div>
        <p className="mb-2.5 text-[13px] font-semibold text-ink/80">Show me jobs within</p>
        <Segmented label="Search radius" value={radius} onChange={setRadius} options={['2', '5', '10', '25'].map((r) => ({ value: r, label: `${r} miles` }))} />
      </div>
      <Switch checked={discoverable} onChange={setDiscoverable} label="Let verified employers find me" description="They see your first name, last initial, age range, skills, rate and rough distance — nothing else." />
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        <Button loading={saving} onClick={save} data-testid="save-work-profile">Save</Button>
      </div>
    </Card>
  );
}
