'use client';
import { Info, Phone } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { KeyValues } from '@/components/ui/Misc';
import type { BookingDetail } from '@/lib/bookings';
import { phone, rate, shiftLabel } from '@/lib/format';

/** Job facts, the note, and — once confirmed / handed off — the address and contacts. */
export function BookingFacts({ b }: { b: BookingDetail }) {
  const upcoming = b.job.shifts.filter((s) => new Date(s.end_at) > new Date());
  const rows = [
    { label: 'Pay', value: rate(b.job.rate_cents, b.job.pay_type), accent: true },
    { label: 'When', value: upcoming[0] ? shiftLabel(upcoming[0].start_at, upcoming[0].end_at) + (upcoming.length > 1 ? ` (+${upcoming.length - 1} more)` : '') : b.job.schedule_note ?? '—' },
    { label: 'Where', value: b.job.address ? b.job.address.line + (b.revealed ? '' : ' (shared once confirmed)') : `${b.job.city} — address shared once confirmed` },
  ];
  if (b.job.address?.notes) rows.push({ label: 'Access notes', value: b.job.address.notes, accent: false });

  const contacts: { label: string; value: React.ReactNode }[] = [];
  if (b.revealed) {
    if (b.role !== 'employer') {
      contacts.push({ label: b.employer.kind === 'business' ? 'Business contact' : 'Employer', value: [b.employer.contact_name, phone(b.employer.phone)].filter(Boolean).join(' · ') || '—' });
      if (b.employer.supervisor) contacts.push({ label: 'On-site supervisor', value: `${b.employer.supervisor.name} · ${b.employer.supervisor.email}` });
    }
    if (b.role !== 'junior') contacts.push({ label: 'Teen', value: [b.junior.name, phone(b.junior.phone)].filter(Boolean).join(' · ') });
    for (const g of b.junior.guardians ?? []) contacts.push({ label: 'Parent / guardian', value: [g.name, phone(g.phone)].filter(Boolean).join(' · ') });
  }

  const author = b.origin === 'applied' ? (b.role === 'junior' ? 'you' : b.junior.name.split(' ')[0]) : b.role === 'employer' ? 'you' : b.employer.name;

  return (
    <div className="space-y-6">
      <KeyValues rows={rows} />
      {b.message ? (
        <figure className="rounded-card border border-line bg-surface-2 p-5">
          <figcaption className="text-[12.5px] font-semibold uppercase tracking-wider text-muted">Note from {author}</figcaption>
          <blockquote className="mt-2 text-[15px] leading-relaxed text-ink">“{b.message}”</blockquote>
        </figure>
      ) : null}
      {contacts.length ? (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-[16px] text-ink"><Phone className="size-4 text-accent" /> Contacts</h3>
          <KeyValues rows={contacts} />
        </section>
      ) : null}
      {b.state === 'handed_off' ? (
        <Alert tone="info" title="What happens next">
          HireMyJunior has made the introduction. The business is the employer: before the first shift they must hold a Minor Work Permit Endorsement and a
          signed Parent/School Authorization, and follow Washington hour limits for the teen’s age. Pay is arranged directly with the business.
        </Alert>
      ) : null}
      {!b.revealed && b.role !== 'employer' ? (
        <p className="flex items-center gap-2 text-[13px] text-muted"><Info className="size-4" /> Phone numbers and the exact address are shared once this is confirmed.</p>
      ) : null}
    </div>
  );
}
