'use client';
import { useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { DateInput } from '@/components/app/DateInput';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChipGroup } from '@/components/ui/Chip';
import { Input, Textarea } from '@/components/ui/Field';
import { SectionTitle } from '@/components/ui/Misc';
import { useAuth } from '@/lib/auth';
import { parseUsDate } from '@/lib/dates';
import { parseTime } from '@/lib/format';
import { jobImageUrl, useCategories, type JobDetail } from '@/lib/jobs';
import { AppError, errorMessage, rpc } from '@/lib/rpc';
import { uploadFile } from '@/lib/upload';

const TZ = 'America/Los_Angeles';
const localDate = new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: '2-digit', day: '2-digit', year: 'numeric' });
const localTime = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

interface ShiftDraft { key: number; date: string; start: string; end: string }
let seq = 0;
const blank = (): ShiftDraft => ({ key: seq++, date: '', start: '', end: '' });

/** Post or edit a job. All times are Washington time. */
export function JobForm({ initial, defaults, track }: { initial: JobDetail | null; defaults: { zip: string; city: string }; track: 'casual' | 'regulated' }) {
  const { session, profile } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const categories = useCategories();
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState<string | null>(initial?.category_id ?? null);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [rateText, setRateText] = useState(initial ? String(initial.rate_cents / 100) : '');
  const [scheduleNote, setScheduleNote] = useState(initial?.schedule_note ?? '');
  const [zip, setZip] = useState(initial?.zip ?? defaults.zip);
  const [city, setCity] = useState(initial?.city ?? defaults.city);
  const [address, setAddress] = useState(initial?.address?.line ?? '');
  const [notes, setNotes] = useState(initial?.address?.notes ?? '');
  const [shifts, setShifts] = useState<ShiftDraft[]>(() =>
    initial?.shifts.length
      ? initial.shifts.map((s) => ({ key: seq++, date: localDate.format(new Date(s.start_at)), start: localTime.format(new Date(s.start_at)), end: localTime.format(new Date(s.end_at)) }))
      : [blank()],
  );
  // Each new photo with its preview URL (created on pick, released on remove / unmount).
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const latest = useRef(photos);
  useEffect(() => { latest.current = photos; }, [photos]);
  useEffect(() => () => latest.current.forEach((p) => URL.revokeObjectURL(p.url)), []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'post' | 'draft' | null>(null);

  const allowed = (categories.data ?? []).filter((c) => c.allowed_tracks.includes(track));
  const canPost = profile?.status === 'active';
  const update = (key: number, patch: Partial<ShiftDraft>) => setShifts((all) => all.map((s) => (s.key === key ? { ...s, ...patch } : s)));

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
        if (!date || !start || !end) throw new AppError(`Date ${i + 1}: enter MM/DD/YYYY and times like 9:00 AM.`);
        return { date, start, end };
      });
      setBusy(publish ? 'post' : 'draft');
      const jobId = await rpc('save_job', {
        job_id: initial?.id ?? (null as unknown as string), category_id: category, title, description, rate_cents: cents, pay_type: 'hourly',
        openings: 1, schedule_note: scheduleNote, zip, city, address_line: address, access_notes: notes, shifts: payload, publish,
      });
      for (const [i, { file: f }] of photos.entries()) {
        const path = await uploadFile('job-images', session!.user.id, `${jobId}-${Date.now()}-${i}`, f);
        await rpc('add_job_image', { job_id: jobId, path });
      }
      await Promise.all(['my-jobs', 'job', 'job-search'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
      router.push(`/employer/jobs/${jobId}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card className="space-y-6 p-6 sm:p-8">
          <SectionTitle>The job</SectionTitle>
          <Input label="Job title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekend Dog Walking" maxLength={80} data-testid="job-title" />
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink/80">Category</p>
            <ChipGroup label="Category" options={allowed.map((c) => ({ value: c.id, label: c.name }))} values={category ? [category] : []} onToggle={setCategory} />
          </div>
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What the job involves, what you’ll provide, anything to bring…" maxLength={2000} data-testid="job-description" />
          <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
            <Input label="Hourly rate ($)" value={rateText} onChange={(e) => setRateText(e.target.value)} placeholder="18" inputMode="decimal" data-testid="job-rate" />
            <Input label="Schedule summary" value={scheduleNote} onChange={(e) => setScheduleNote(e.target.value)} placeholder="Sat & Sun, 9–11 AM" maxLength={80} hint="Shown on the job card" />
          </div>
        </Card>

        <Card className="space-y-5 p-6 sm:p-8">
          <SectionTitle>When <span className="text-[13px] font-normal text-muted">(Washington time)</span></SectionTitle>
          {shifts.map((s, i) => (
            <div key={s.key} className="grid items-end gap-3 rounded-card bg-surface-2 p-4 sm:grid-cols-[1.3fr_1fr_1fr_auto]">
              <DateInput label={`Date ${i + 1}`} value={s.date} onChange={(v) => update(s.key, { date: v })} testId={`shift-${i}-date`} />
              <Input label="Start" value={s.start} onChange={(e) => update(s.key, { start: e.target.value })} placeholder="9:00 AM" data-testid={`shift-${i}-start`} />
              <Input label="End" value={s.end} onChange={(e) => update(s.key, { end: e.target.value })} placeholder="11:00 AM" data-testid={`shift-${i}-end`} />
              <Button variant="ghost" size="md" aria-label={`Remove date ${i + 1}`} disabled={shifts.length === 1} onClick={() => setShifts((all) => all.filter((x) => x.key !== s.key))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" icon={<Plus className="size-4" />} onClick={() => setShifts((all) => [...all, blank()])}>Add another date</Button>
        </Card>

        <Card className="space-y-5 p-6 sm:p-8">
          <SectionTitle>Where</SectionTitle>
          <Input label="Street address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="2417 228th Ave NE" data-testid="job-address" />
          <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
            <Input label="ZIP code" value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" />
            <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <Input label="Access notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Side gate code, where to park…" maxLength={300} />
          <Alert tone="safety">Teens see only your city and a rough distance. The street address is shared once a teen is confirmed.</Alert>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <Card className="space-y-4 p-6">
          <SectionTitle>Photos</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {initial?.images.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p} src={jobImageUrl(p)} alt="" className="aspect-square w-full rounded-tile object-cover" />
            ))}
            {photos.map(({ url }) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="aspect-square w-full rounded-tile object-cover" />
                <button
                  className="absolute right-1 top-1 rounded-full bg-ink/70 p-0.5 text-canvas"
                  aria-label="Remove photo"
                  onClick={() => { URL.revokeObjectURL(url); setPhotos((p) => p.filter((x) => x.url !== url)); }}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => fileInput.current?.click()} className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-tile border-2 border-dashed border-line-strong text-muted transition-colors hover:border-accent hover:text-accent">
              <ImagePlus className="size-5" /><span className="text-[11px] font-semibold">Add</span>
            </button>
          </div>
          <input ref={fileInput} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => {
              const room = 6 - (initial?.images.length ?? 0) - photos.length;
              const picked = Array.from(e.target.files ?? []).slice(0, Math.max(0, room)).map((file) => ({ file, url: URL.createObjectURL(file) }));
              setPhotos((p) => [...p, ...picked]);
              e.target.value = '';
            }} />
          <p className="text-[12.5px] text-muted">The yard, the dog, the space. Please leave out people and house numbers.</p>
        </Card>
        <Card className="space-y-3 p-6">
          {!canPost ? <Alert tone="warning">Finish verification before posting. You can save a draft now.</Alert> : null}
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Button block size="lg" disabled={!canPost} loading={busy === 'post'} onClick={() => save(true)} data-testid="publish-job">
            {initial?.status === 'posted' ? 'Save changes' : 'Post job'}
          </Button>
          {initial?.status !== 'posted' ? <Button block variant="ghost" loading={busy === 'draft'} onClick={() => save(false)} data-testid="save-draft">Save as draft</Button> : null}
        </Card>
      </aside>
    </div>
  );
}
