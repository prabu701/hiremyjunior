import { Button, ChipGroup, Icon, Notice, Screen, Text, TextField, useTheme } from '@hmj/ui';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { parseUsDate } from '@/components/DateField';
import { newShift, ShiftEditor, type ShiftDraft } from '@/components/ShiftEditor';
import { useAuth } from '@/lib/auth';
import { parseTime } from '@/lib/format';
import { jobImageUrl, useCategories, useJobDetail, type JobDetail } from '@/lib/jobs';
import { queryClient, useMyEmployer } from '@/lib/queries';
import { AppError, errorMessage, rpc } from '@/lib/rpc';
import { uploadAsset } from '@/lib/upload';

const TZ = 'America/Los_Angeles';
const localDate = new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: '2-digit', day: '2-digit', year: 'numeric' });
const localTime = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

/** Prototype "Employer — Post Job" (also edits: /employer/post-job?id=…). */
export default function PostJob() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useJobDetail(id);
  const employer = useMyEmployer();
  if ((id && existing.isLoading) || employer.isLoading) return <Screen><ActivityIndicator /></Screen>;
  return <PostJobForm initial={existing.data ?? null} defaults={{ zip: employer.data?.zip ?? '', city: employer.data?.city ?? '' }} track={employer.data?.kind === 'business' ? 'regulated' : 'casual'} />;
}

function PostJobForm({ initial, defaults, track }: { initial: JobDetail | null; defaults: { zip: string; city: string }; track: 'casual' | 'regulated' }) {
  const { session, profile } = useAuth();
  const { t, radius } = useTheme();
  const categories = useCategories();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState<string | null>(initial?.category_id ?? null);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [rateText, setRateText] = useState(initial ? String(initial.rate_cents / 100) : '');
  const [scheduleNote, setScheduleNote] = useState(initial?.schedule_note ?? '');
  const [zip, setZip] = useState(initial?.zip ?? defaults.zip);
  const [city, setCity] = useState(initial?.city ?? defaults.city);
  const [address, setAddress] = useState(initial?.address?.line ?? '');
  const [accessNotes, setAccessNotes] = useState(initial?.address?.notes ?? '');
  const [shifts, setShifts] = useState<ShiftDraft[]>(
    initial?.shifts.length
      ? initial.shifts.map((s, i) => ({ key: `e${i}`, date: localDate.format(new Date(s.start_at)), start: localTime.format(new Date(s.start_at)), end: localTime.format(new Date(s.end_at)) }))
      : [newShift()],
  );
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'post' | 'draft' | null>(null);

  const allowed = (categories.data ?? []).filter((c) => c.allowed_tracks.includes(track));
  const back = () => (router.canGoBack() ? router.back() : router.replace('/employer/jobs'));

  async function pickPhotos() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsMultipleSelection: true, selectionLimit: 6, quality: 0.8 });
    if (!res.canceled) setPhotos((p) => [...p, ...res.assets].slice(0, 6 - (initial?.images.length ?? 0)));
  }

  async function save(publish: boolean) {
    setError(null);
    try {
      if (!category) throw new AppError('Choose a category.');
      const cents = Math.round(Number(rateText.replace(/[^0-9.]/g, '')) * 100);
      if (!cents) throw new AppError('Enter the hourly rate.');
      const payload = shifts.map((s, i) => {
        const date = parseUsDate(s.date);
        const start = parseTime(s.start);
        const end = parseTime(s.end);
        if (!date || !start || !end) throw new AppError(`Shift ${i + 1}: enter a date (MM/DD/YYYY) and start/end times like 9:00 AM.`);
        return { date, start, end };
      });
      setBusy(publish ? 'post' : 'draft');
      const jobId = await rpc('save_job', {
        job_id: initial?.id ?? (null as unknown as string), category_id: category, title, description, rate_cents: cents, pay_type: 'hourly',
        openings: 1, schedule_note: scheduleNote, zip, city, address_line: address, access_notes: accessNotes, shifts: payload, publish,
      });
      for (const [i, photo] of photos.entries()) {
        const path = await uploadAsset('job-images', session!.user.id, `${jobId}-${Date.now()}-${i}`, photo);
        await rpc('add_job_image', { job_id: jobId, path });
      }
      await Promise.all(['my-jobs', 'job', 'job-search'].map((k) => queryClient.invalidateQueries({ queryKey: [k] })));
      router.replace(`/employer/job/${jobId}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const canPost = profile?.status === 'active';

  return (
    <Screen
      onBack={back}
      headerTitle={initial ? 'Edit Job' : 'Post a Job'}
      footer={
        <>
          <Button testID="publish-job" label={initial?.status === 'posted' ? 'Save changes' : 'Post Job'} onPress={() => save(true)} loading={busy === 'post'} disabled={!canPost} />
          {initial?.status !== 'posted' ? <Button testID="save-draft" label="Save as draft" variant="ghost" onPress={() => save(false)} loading={busy === 'draft'} /> : null}
        </>
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        <Pressable testID="add-photos" onPress={pickPhotos} accessibilityRole="button" style={{ width: 96, height: 96, borderRadius: radius.tile, borderWidth: 2, borderStyle: 'dashed', borderColor: t.navBorder, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Icon name="camera" size={22} color={t.muted} />
          <Text style={{ fontSize: 11 }} muted>Add photos</Text>
        </Pressable>
        {initial?.images.map((p) => <Image key={p} source={{ uri: jobImageUrl(p) }} style={{ width: 96, height: 96, borderRadius: radius.tile }} />)}
        {photos.map((p) => <Image key={p.uri} source={{ uri: p.uri }} style={{ width: 96, height: 96, borderRadius: radius.tile }} />)}
      </ScrollView>

      <TextField testID="job-title" label="Job title" value={title} onChangeText={setTitle} placeholder="Weekend Dog Walking" maxLength={80} />
      <View style={{ gap: 10 }}>
        <Text variant="label">Category</Text>
        <ChipGroup options={allowed.map((c) => ({ value: c.id, label: c.name }))} values={category ? [category] : []} onToggle={setCategory} />
      </View>
      <TextField testID="job-description" label="Description" value={description} onChangeText={setDescription} placeholder="What the job involves, what you'll provide, anything to bring…" multiline maxLength={2000} style={{ minHeight: 80 }} />
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1 }}><TextField testID="job-rate" label="Hourly rate ($)" value={rateText} onChangeText={setRateText} placeholder="18" keyboardType="decimal-pad" /></View>
        <View style={{ flex: 2 }}><TextField testID="job-schedule-note" label="Schedule summary" value={scheduleNote} onChangeText={setScheduleNote} placeholder="Sat & Sun, 9–11 AM" maxLength={80} /></View>
      </View>

      <Text variant="heading" style={{ fontSize: 15 }}>When</Text>
      <ShiftEditor shifts={shifts} onChange={setShifts} />

      <Text variant="heading" style={{ fontSize: 15 }}>Where</Text>
      <TextField testID="job-address" label="Street address" value={address} onChangeText={setAddress} placeholder="2417 228th Ave NE" />
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1 }}><TextField testID="job-zip" label="ZIP code" value={zip} onChangeText={(v) => setZip(v.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" /></View>
        <View style={{ flex: 2 }}><TextField testID="job-city" label="City" value={city} onChangeText={setCity} /></View>
      </View>
      <TextField label="Access notes (optional)" value={accessNotes} onChangeText={setAccessNotes} placeholder="Side gate code, where to park…" maxLength={300} />
      <Notice tone={2} icon="shield">Teens see only your city and rough distance. The street address is shared once a teen is confirmed.</Notice>
      {!canPost ? <Notice>Finish verification (Home) before posting. You can save a draft now.</Notice> : null}
      {error ? <Notice icon="alert">{error}</Notice> : null}
    </Screen>
  );
}
