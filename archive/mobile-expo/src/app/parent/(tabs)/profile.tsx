import { ProfileTab } from '@/components/ProfileTab';
import { useMyParent } from '@/lib/queries';

export default function ParentProfile() {
  const parent = useMyParent();
  return <ProfileTab rows={[{ label: 'Location', value: parent.data ? `${parent.data.city} ${parent.data.zip}` : '—' }]} />;
}
