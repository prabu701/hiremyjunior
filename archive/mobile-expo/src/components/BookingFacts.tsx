import { InfoRows, Notice, Text } from '@hmj/ui';
import { View } from 'react-native';
import type { BookingDetail } from '@/lib/bookings';
import { phone, rate, shiftLabel } from '@/lib/format';

/** Job facts + (once confirmed / handed off) the address and contacts, for any party. */
export function BookingFacts({ b }: { b: BookingDetail }) {
  const upcoming = b.job.shifts.filter((s) => new Date(s.end_at) > new Date());
  const rows = [
    { label: 'Rate', value: rate(b.job.rate_cents, b.job.pay_type), accent: true },
    { label: 'When', value: upcoming[0] ? shiftLabel(upcoming[0].start_at, upcoming[0].end_at) + (upcoming.length > 1 ? ` +${upcoming.length - 1} more` : '') : b.job.schedule_note ?? '—' },
    { label: 'Where', value: b.job.address ? b.job.address.line + (b.revealed ? '' : ' (shared once confirmed)') : `${b.job.city} (address shared once confirmed)` },
  ];
  if (b.job.address?.notes) rows.push({ label: 'Access notes', value: b.job.address.notes, accent: false });

  const contacts: { label: string; value: string }[] = [];
  if (b.revealed) {
    if (b.role !== 'employer') {
      contacts.push({ label: b.employer.kind === 'business' ? 'Contact' : 'Employer', value: [b.employer.contact_name, phone(b.employer.phone)].filter(Boolean).join(' · ') || '—' });
      if (b.employer.supervisor) contacts.push({ label: 'On-site supervisor', value: `${b.employer.supervisor.name} · ${b.employer.supervisor.email}` });
    }
    if (b.role !== 'junior') contacts.push({ label: 'Teen', value: [b.junior.name, phone(b.junior.phone)].filter(Boolean).join(' · ') });
    for (const g of b.junior.guardians ?? []) contacts.push({ label: 'Parent / guardian', value: [g.name, phone(g.phone)].filter(Boolean).join(' · ') });
  }

  return (
    <>
      <InfoRows rows={rows} />
      {b.message ? (
        <View style={{ gap: 6 }}>
          <Text variant="label">{b.origin === 'applied' ? `Note from ${b.role === 'junior' ? 'you' : b.junior.name.split(' ')[0]}` : `Note from ${b.employer.name}`}</Text>
          <Text style={{ fontSize: 14, lineHeight: 20 }}>{b.message}</Text>
        </View>
      ) : null}
      {contacts.length ? (
        <View style={{ gap: 8 }}>
          <Text variant="heading" style={{ fontSize: 15 }}>Contacts</Text>
          <InfoRows rows={contacts} />
        </View>
      ) : null}
      {b.state === 'handed_off' ? (
        <Notice tone={2} icon="info">
          {'HireMyJunior has made the introduction. The business is the employer: before the first shift they must hold a Minor Work Permit Endorsement and a signed Parent/School Authorization, and follow WA hour limits. Pay is arranged directly with the business.'}
        </Notice>
      ) : null}
    </>
  );
}
