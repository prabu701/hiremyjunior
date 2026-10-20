import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { homeHref } from '@/lib/routes';
import Index from './index';

/** Post-sign-in landing: forwards to the role's home, carrying `requested` for the mismatch notice. */
export default function Home() {
  const { loading, session, profile } = useAuth();
  const { requested } = useLocalSearchParams<{ requested?: string }>();
  if (loading || (session && !profile)) return <Index />;
  if (!session || !profile) return <Redirect href="/welcome" />;
  const href = homeHref(profile);
  return <Redirect href={requested && typeof href === 'string' ? `${href}?requested=${requested}` as never : href} />;
}
