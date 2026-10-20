import { ProfileTab } from '@/components/ProfileTab';
import { useMyEmployer } from '@/lib/queries';

export default function EmployerProfile() {
  const e = useMyEmployer().data;
  return (
    <ProfileTab
      rows={[
        { label: 'Shown to teens as', value: e?.display_name ?? '—' },
        { label: 'Type', value: e ? (e.kind === 'business' ? 'Business' : 'Household') : '—' },
        { label: 'Location', value: e ? `${e.city} ${e.zip}` : '—' },
        ...(e?.kind === 'business' ? [{ label: 'UBI', value: e.ubi ?? '—' }, { label: 'Supervisor', value: e.supervisor_name ?? '—' }] : []),
      ]}
    />
  );
}
